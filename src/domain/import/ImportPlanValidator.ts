import { AssetCategory } from '../entities/assets/AssetCategory';
import { InvestmentType } from '../entities/assets/Investment';
import { ValueModel } from '../entities/assets/ValueModel';
import { ExpenseCategory } from '../entities/expenses/ExpenseCategory';
import { Currency, isCurrencyCode, toCurrencyCode } from '../entities/shared/Currency';
import { validateAsset, validateExpense, validateLoan } from '../validation/EntityValidators';
import { summariseIssues } from '../validation/ValidationIssue';
import { ImportContext } from './ImportContextBuilder';
import {
  CREATE_OPERATION_KINDS,
  ImportOperation,
  ImportOperationKind,
  ImportPlan,
  IMPORT_OPERATION_KINDS,
  isDestructive,
  OperationFlag,
  ValidatedOperation,
} from './ImportOperation';
import { isNumberInSource, isTotalDerivedFromSource } from './SourceNormalizer';

/**
 * Everything the model returns passes through here before a human sees it.
 *
 * Three jobs:
 *  - structural: is this even a well-formed operation against real ids?
 *  - provenance: does every number it reported actually occur in the file?
 *  - safety: is this a duplicate of something already stored, or a delete?
 *
 * Nothing is dropped silently — anything rejected is reported as a plan warning.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_FUTURE_DAYS = 2;

/**
 * Operations the prompt no longer offers. The model may still emit one from
 * memory of an older schema, so name the reason rather than reporting it as an
 * unrecognised type.
 */
const RETIRED_OPERATION_KINDS = new Set([
  'deleteTransaction',
  'updateExpense',
  'deleteExpense',
  'deleteLoanPayment',
]);

interface Bag {
  [key: string]: unknown;
}

function asRecord(value: unknown): Bag | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Bag) : undefined;
}

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

function parseIsoDate(value: unknown): Date | undefined {
  const text = asString(value);
  if (!text || !DATE_PATTERN.test(text)) return undefined;
  const parsed = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function isTooFarInFuture(date: Date): boolean {
  return date.getTime() > Date.now() + MAX_FUTURE_DAYS * 24 * 60 * 60 * 1000;
}

function coerceCategory(
  raw: unknown,
  allowed: readonly string[],
  warnings: string[],
  field: string
): string {
  const text = asString(raw);
  if (!text) {
    warnings.push(`No ${field} given; recorded as "Other".`);
    return 'Other';
  }
  const exact = allowed.find(value => value.toLowerCase() === text.toLowerCase());
  if (exact) return exact;
  warnings.push(`Unknown ${field} "${text}"; recorded as "Other".`);
  return 'Other';
}

function coerceCurrency(raw: unknown, warnings: string[]): Currency {
  const text = asString(raw);
  if (text && isCurrencyCode(text.toUpperCase())) {
    return text.toUpperCase() as Currency;
  }
  const coerced = toCurrencyCode(text);
  warnings.push(`Unrecognised currency "${text ?? ''}"; using ${coerced}.`);
  return coerced;
}

function formatAmount(amount: number, currency: string): string {
  return `${currency} ${amount.toLocaleString('en-IN')}`;
}

export interface ValidationInput {
  raw: unknown;
  context: ImportContext;
  numericTokens: Set<string>;
  /**
   * Namespaces the placeholder refs this response defines. A large file is
   * analysed in several independent requests, and each one numbers its refs from
   * scratch — without a per-request prefix, two parts both naming a ref "a1"
   * would collapse onto one asset in the executor's ref map and silently attach
   * the first part's trades to the second part's asset.
   */
  refPrefix?: string;
  /** Namespaced ref → name, for assets an earlier part already asked to create. */
  pendingAssets?: ReadonlyMap<string, string>;
  /** Namespaced ref → name, for loans an earlier part already asked to create. */
  pendingLoans?: ReadonlyMap<string, string>;
}

export function validateImportPlan({
  raw,
  context,
  numericTokens,
  refPrefix = '',
  pendingAssets,
  pendingLoans,
}: ValidationInput): ImportPlan {
  const planWarnings: string[] = [];
  const payload = asRecord(raw);

  if (!payload) {
    return {
      operations: [],
      warnings: ['The model did not return a JSON object.'],
      sourceSummary: '',
    };
  }

  const rawOperations = Array.isArray(payload.operations) ? payload.operations : undefined;
  if (!rawOperations) {
    return {
      operations: [],
      warnings: ['The model response had no "operations" array.'],
      sourceSummary: asString(payload.sourceSummary) ?? '',
    };
  }

  const assetIds = new Set(context.assets.map(asset => asset.id));
  const loanIds = new Set(context.loans.map(loan => loan.id));

  // Refs an operation may attach to: those an earlier part of the file defined,
  // plus the ones this response defines and that survive validation. Populated
  // by the create pass below — registering a ref before its create is known to
  // be valid would leave orphaned children that only fail at apply time, after
  // the user has already approved them.
  const assetRefNames = new Map<string, string>(pendingAssets ?? []);
  const loanRefNames = new Map<string, string>(pendingLoans ?? []);

  const creates: ValidatedOperation[] = [];
  const others: ValidatedOperation[] = [];

  const runPass = (wantCreates: boolean) => {
    rawOperations.forEach((candidate, index) => {
      const record = asRecord(candidate);
      if (!record) {
        if (wantCreates)
          planWarnings.push(`Operation ${index + 1} was not an object and was dropped.`);
        return;
      }

      const rawKind = asString(record.op);
      const kind = rawKind as ImportOperationKind | undefined;
      if (!kind || !IMPORT_OPERATION_KINDS.includes(kind)) {
        if (wantCreates) {
          planWarnings.push(
            RETIRED_OPERATION_KINDS.has(rawKind ?? '')
              ? `Operation ${index + 1} ("${rawKind}") was dropped: editing or deleting an individual transaction, expense or payment is not supported, because the model is never shown their ids.`
              : `Operation ${index + 1} had unknown type "${String(record.op)}" and was dropped.`
          );
        }
        return;
      }

      if (CREATE_OPERATION_KINDS.includes(kind) !== wantCreates) return;

      const warnings: string[] = [];
      const flags: OperationFlag[] = [];
      const unverifiedNumbers: string[] = [];

      /** Records a number and flags it if it cannot be traced to the source. */
      const checkProvenance = (value: number | undefined, label: string) => {
        if (value === undefined) return;
        if (!isNumberInSource(value, numericTokens)) {
          unverifiedNumbers.push(`${label} ${value}`);
        }
      };

      const built = buildOperation({
        kind,
        record,
        assetIds,
        loanIds,
        assetRefNames,
        loanRefNames,
        refPrefix,
        numericTokens,
        warnings,
        checkProvenance,
      });

      if (!built) {
        planWarnings.push(
          `Operation ${index + 1} (${kind}) was dropped: ${warnings.join(' ') || 'could not be interpreted.'}`
        );
        return;
      }

      if (unverifiedNumbers.length > 0) {
        flags.push('unverified');
        warnings.push(`Not found in the source file: ${unverifiedNumbers.join(', ')}.`);
      }

      if (isDestructive(kind)) {
        flags.push('destructive');
      }

      if (isDuplicate(built.operation, context)) {
        flags.push('duplicate');
        warnings.push('A matching record already exists.');
      }

      const validated: ValidatedOperation = {
        operation: built.operation,
        flags,
        warnings,
        summary: built.summary,
      };

      if (wantCreates) {
        const operation = built.operation;
        if (operation.op === 'createAsset') assetRefNames.set(operation.ref, operation.name);
        if (operation.op === 'createLoan') loanRefNames.set(operation.ref, operation.name);
        creates.push(validated);
      } else {
        others.push(validated);
      }
    });
  };

  runPass(true);
  runPass(false);

  return {
    operations: [...creates, ...others],
    warnings: planWarnings,
    sourceSummary: asString(payload.sourceSummary) ?? '',
  };
}

interface BuildArgs {
  kind: ImportOperationKind;
  record: Bag;
  assetIds: Set<number>;
  loanIds: Set<number>;
  /** Namespaced ref → name, for every asset this plan can attach to. */
  assetRefNames: ReadonlyMap<string, string>;
  loanRefNames: ReadonlyMap<string, string>;
  refPrefix: string;
  numericTokens: Set<string>;
  warnings: string[];
  checkProvenance: (value: number | undefined, label: string) => void;
}

/**
 * A ref the model wrote is either one it just invented (namespace it) or one we
 * showed it from an earlier part of the file (already namespaced).
 */
function resolveRef(
  raw: string | undefined,
  known: ReadonlyMap<string, string>,
  refPrefix: string
): string | undefined {
  if (!raw) return undefined;
  if (known.has(raw)) return raw;
  const namespaced = `${refPrefix}${raw}`;
  return known.has(namespaced) ? namespaced : undefined;
}

function buildOperation(
  args: BuildArgs
): { operation: ImportOperation; summary: string } | undefined {
  const { kind, record, warnings } = args;

  switch (kind) {
    case 'createAsset':
      return buildCreateAsset(args);
    case 'updateAsset':
      return buildUpdateAsset(args);
    case 'deleteAsset': {
      const assetId = asNumber(record.assetId);
      if (assetId === undefined || !args.assetIds.has(assetId)) {
        warnings.push(`Asset ${String(record.assetId)} does not exist.`);
        return undefined;
      }
      return { operation: { op: 'deleteAsset', assetId }, summary: `Delete asset #${assetId}` };
    }
    case 'addTransaction':
      return buildAddTransaction(args);
    case 'addExpense':
      return buildAddExpense(args);
    case 'createLoan':
      return buildCreateLoan(args);
    case 'addLoanPayment':
      return buildAddLoanPayment(args);
    default:
      return undefined;
  }
}

function buildCreateAsset(args: BuildArgs) {
  const { record, warnings, checkProvenance } = args;

  const rawRef = asString(record.ref);
  const name = asString(record.name);
  if (!rawRef || !name) {
    warnings.push('Needs both a ref and a name.');
    return undefined;
  }
  const ref = `${args.refPrefix}${rawRef}`;

  const category = coerceCategory(
    record.category,
    Object.values(AssetCategory),
    warnings,
    'category'
  );
  const currency = coerceCurrency(record.currency, warnings);

  const rawValueModel = asString(record.valueModel);
  const valueModel = (Object.values(ValueModel) as string[]).includes(rawValueModel ?? '')
    ? (rawValueModel as ValueModel)
    : ValueModel.MARKET_BASED;
  if (valueModel !== rawValueModel) {
    warnings.push(`Unknown valuation model "${rawValueModel ?? ''}"; using MARKET_BASED.`);
  }

  const interestRate = asNumber(record.interestRate);
  const maturityAmount = asNumber(record.maturityAmount);
  const manualValue = asNumber(record.manualValue);
  checkProvenance(interestRate, 'interest rate');
  checkProvenance(maturityAmount, 'maturity amount');
  checkProvenance(manualValue, 'value');

  const maturityDateRaw = asString(record.maturityDate);
  const maturityDate = maturityDateRaw ? parseIsoDate(maturityDateRaw) : undefined;
  if (maturityDateRaw && !maturityDate) {
    warnings.push(`Ignored unparseable maturity date "${maturityDateRaw}".`);
  }

  const operation = {
    op: 'createAsset' as const,
    ref,
    name,
    category,
    currency,
    valueModel,
    description: asString(record.description),
    interestRate,
    maturityDate: maturityDate ? maturityDateRaw : undefined,
    maturityAmount,
    manualValue,
  };

  const issues = validateAsset({
    id: undefined,
    name,
    description: operation.description ?? '',
    category,
    currency,
    valueModel,
    interestRate,
    maturityDate,
    maturityAmount,
    manualValue,
    manualValueUpdatedAt: undefined,
    script: undefined,
    scriptValue: undefined,
    scriptValueUpdatedAt: undefined,
  });
  if (issues.length > 0) {
    warnings.push(summariseIssues(issues));
    return undefined;
  }

  return { operation, summary: `Create asset "${name}" (${category}, ${currency})` };
}

function buildUpdateAsset(args: BuildArgs) {
  const { record, warnings, checkProvenance } = args;

  const assetId = asNumber(record.assetId);
  const changes = asRecord(record.changes);
  if (assetId === undefined || !args.assetIds.has(assetId)) {
    warnings.push(`Asset ${String(record.assetId)} does not exist.`);
    return undefined;
  }
  if (!changes) {
    warnings.push('No changes object given.');
    return undefined;
  }

  const manualValue = asNumber(changes.manualValue);
  const maturityAmount = asNumber(changes.maturityAmount);
  const interestRate = asNumber(changes.interestRate);
  checkProvenance(manualValue, 'value');
  checkProvenance(maturityAmount, 'maturity amount');
  checkProvenance(interestRate, 'interest rate');

  // Parsed rather than passed through: the executor turns this straight into a
  // Date, so an unparseable string would be stored as an Invalid Date.
  const maturityDateRaw = asString(changes.maturityDate);
  const maturityDate = maturityDateRaw ? parseIsoDate(maturityDateRaw) : undefined;
  if (maturityDateRaw && !maturityDate) {
    warnings.push(`Ignored unparseable maturity date "${maturityDateRaw}".`);
  }

  const changed = {
    name: asString(changes.name),
    description: asString(changes.description),
    category: changes.category
      ? coerceCategory(changes.category, Object.values(AssetCategory), warnings, 'category')
      : undefined,
    manualValue,
    interestRate,
    maturityDate: maturityDate ? maturityDateRaw : undefined,
    maturityAmount,
  };

  if (Object.values(changed).every(value => value === undefined)) {
    warnings.push('No usable changes.');
    return undefined;
  }

  const described =
    manualValue !== undefined
      ? `set value to ${manualValue.toLocaleString('en-IN')}`
      : Object.keys(changed)
          .filter(key => changed[key as keyof typeof changed] !== undefined)
          .join(', ');

  return {
    operation: { op: 'updateAsset' as const, assetId, changes: changed },
    summary: `Update asset #${assetId}: ${described}`,
  };
}

function buildAddTransaction(args: BuildArgs) {
  const { record, warnings, checkProvenance } = args;

  const assetId = asNumber(record.assetId);
  const rawAssetRef = asString(record.assetRef);
  const assetRef = resolveRef(rawAssetRef, args.assetRefNames, args.refPrefix);

  if (assetId !== undefined && !args.assetIds.has(assetId)) {
    warnings.push(`Asset ${assetId} does not exist.`);
    return undefined;
  }
  if (assetId === undefined && !assetRef) {
    warnings.push(
      `No existing assetId, and assetRef "${rawAssetRef ?? ''}" is not created by this plan.`
    );
    return undefined;
  }

  const rawType = asString(record.type)?.toLowerCase();
  if (rawType !== InvestmentType.BUY && rawType !== InvestmentType.SELL) {
    warnings.push(`Transaction type must be buy or sell, got "${rawType ?? ''}".`);
    return undefined;
  }

  const date = parseIsoDate(record.date);
  if (!date) {
    warnings.push(`Date "${String(record.date)}" is not a valid YYYY-MM-DD date.`);
    return undefined;
  }
  if (isTooFarInFuture(date)) {
    warnings.push('Date is in the future.');
  }

  const rawQuantity = asNumber(record.quantity);
  const quantity = rawQuantity !== undefined ? Math.abs(rawQuantity) : undefined;
  if (rawQuantity !== undefined && rawQuantity < 0) {
    warnings.push('Quantity was negative; direction is taken from the transaction type.');
  }

  // A tradebook with a per-unit price column has no total to copy, so the model
  // is asked for the price and the app does the multiplication. Doing it here
  // keeps arithmetic out of the model and keeps both factors checkable against
  // the file — the product itself never appears in it.
  const unitPrice = asNumber(record.unitPrice);
  const reported = asNumber(record.totalAmount);
  const derived =
    unitPrice !== undefined && quantity !== undefined
      ? Math.round(unitPrice * quantity * 100) / 100
      : undefined;
  const totalAmount = reported ?? derived;

  if (totalAmount === undefined || totalAmount <= 0) {
    warnings.push('Needs a positive totalAmount, or a unitPrice and quantity to derive it from.');
    return undefined;
  }

  if (isTotalDerivedFromSource(totalAmount, quantity, args.numericTokens)) {
    // Both factors are in the file and their product is this total — traced.
    checkProvenance(quantity, 'quantity');
  } else {
    checkProvenance(totalAmount, 'amount');
    checkProvenance(quantity, 'quantity');
  }

  const target =
    assetId !== undefined
      ? `asset #${assetId}`
      : `new asset "${args.assetRefNames.get(assetRef!)}"`;
  const quantityText = quantity !== undefined ? `${quantity} units, ` : '';

  return {
    operation: {
      op: 'addTransaction' as const,
      assetId,
      assetRef: assetId === undefined ? assetRef : undefined,
      type: rawType as InvestmentType,
      quantity,
      totalAmount,
      date: asString(record.date)!,
    },
    summary: `${rawType === 'sell' ? 'Sell' : 'Buy'} ${quantityText}${totalAmount.toLocaleString('en-IN')} on ${asString(record.date)} → ${target}`,
  };
}

function buildAddExpense(args: BuildArgs) {
  const { record, warnings, checkProvenance } = args;

  const amount = asNumber(record.amount);
  const date = parseIsoDate(record.date);

  if (amount === undefined || amount <= 0) {
    warnings.push('Amount must be a positive number.');
    return undefined;
  }
  if (!date) {
    warnings.push(`Date "${String(record.date)}" is not a valid YYYY-MM-DD date.`);
    return undefined;
  }
  if (isTooFarInFuture(date)) {
    warnings.push('Date is in the future.');
  }

  checkProvenance(amount, 'amount');

  const currency = coerceCurrency(record.currency, warnings);
  const category = coerceCategory(
    record.category,
    Object.values(ExpenseCategory),
    warnings,
    'category'
  );
  const description = asString(record.description) ?? '';

  const issues = validateExpense({
    id: undefined,
    amount,
    currency,
    date,
    category,
    isEssential: record.isEssential === true,
    description,
  });
  if (issues.length > 0) {
    warnings.push(summariseIssues(issues));
    return undefined;
  }

  return {
    operation: {
      op: 'addExpense' as const,
      amount,
      currency,
      date: asString(record.date)!,
      category,
      isEssential: record.isEssential === true,
      description,
    },
    summary: `Expense ${formatAmount(amount, currency)} on ${asString(record.date)} — ${category}${description ? ` (${description})` : ''}`,
  };
}

function buildCreateLoan(args: BuildArgs) {
  const { record, warnings, checkProvenance } = args;

  const rawRef = asString(record.ref);
  const name = asString(record.name);
  const principalAmount = asNumber(record.principalAmount);
  const startDate = parseIsoDate(record.startDate);

  if (!rawRef || !name) {
    warnings.push('Needs both a ref and a name.');
    return undefined;
  }
  if (principalAmount === undefined || !startDate) {
    warnings.push('Needs a principal amount and a valid start date.');
    return undefined;
  }
  const ref = `${args.refPrefix}${rawRef}`;

  checkProvenance(principalAmount, 'principal');

  const currency = coerceCurrency(record.currency, warnings);
  const description = asString(record.description) ?? '';

  const issues = validateLoan({
    id: undefined,
    name,
    description,
    principalAmount,
    currency,
    startDate,
  });
  if (issues.length > 0) {
    warnings.push(summariseIssues(issues));
    return undefined;
  }

  return {
    operation: {
      op: 'createLoan' as const,
      ref,
      name,
      principalAmount,
      currency,
      startDate: asString(record.startDate)!,
      description,
    },
    summary: `Create loan "${name}" (${formatAmount(principalAmount, currency)})`,
  };
}

function buildAddLoanPayment(args: BuildArgs) {
  const { record, warnings, checkProvenance } = args;

  const loanId = asNumber(record.loanId);
  const rawLoanRef = asString(record.loanRef);
  const loanRef = resolveRef(rawLoanRef, args.loanRefNames, args.refPrefix);

  if (loanId !== undefined && !args.loanIds.has(loanId)) {
    warnings.push(`Loan ${loanId} does not exist.`);
    return undefined;
  }
  if (loanId === undefined && !loanRef) {
    warnings.push(
      `No existing loanId, and loanRef "${rawLoanRef ?? ''}" is not created by this plan.`
    );
    return undefined;
  }

  const amount = asNumber(record.amount);
  const date = parseIsoDate(record.date);

  if (amount === undefined || amount <= 0) {
    warnings.push('Amount must be a positive number.');
    return undefined;
  }
  if (!date) {
    warnings.push(`Date "${String(record.date)}" is not a valid YYYY-MM-DD date.`);
    return undefined;
  }

  checkProvenance(amount, 'amount');

  const target =
    loanId !== undefined ? `loan #${loanId}` : `new loan "${args.loanRefNames.get(loanRef!)}"`;

  return {
    operation: {
      op: 'addLoanPayment' as const,
      loanId,
      loanRef: loanId === undefined ? loanRef : undefined,
      date: asString(record.date)!,
      amount,
      description: asString(record.description) ?? '',
    },
    summary: `Payment ${amount.toLocaleString('en-IN')} on ${asString(record.date)} → ${target}`,
  };
}

/**
 * Re-importing the same statement is the common case, so catching it matters
 * more than catching every edge. Matches on the natural key a statement row has.
 */
function isDuplicate(operation: ImportOperation, context: ImportContext): boolean {
  if (operation.op === 'addTransaction' && operation.assetId !== undefined) {
    return context.existingTransactions.some(
      existing =>
        existing.assetId === operation.assetId &&
        existing.date === operation.date &&
        Math.abs(existing.totalAmount - operation.totalAmount) < 0.01
    );
  }

  if (operation.op === 'addExpense') {
    return context.existingExpenses.some(
      existing =>
        existing.date === operation.date &&
        Math.abs(existing.amount - operation.amount) < 0.01 &&
        existing.description.trim().toLowerCase() === operation.description.trim().toLowerCase()
    );
  }

  return false;
}
