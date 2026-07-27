import { AssetCategory } from '../entities/assets/AssetCategory';
import { InvestmentType } from '../entities/assets/Investment';
import { ValueModel } from '../entities/assets/ValueModel';
import { ExpenseCategory } from '../entities/expenses/ExpenseCategory';
import { Currency, isCurrencyCode, toCurrencyCode } from '../entities/shared/Currency';
import { validateAsset, validateExpense, validateLoan } from '../validation/EntityValidators';
import { summariseIssues } from '../validation/ValidationIssue';
import { ImportContext } from './ImportContextBuilder';
import {
  ImportOperation,
  ImportOperationKind,
  ImportPlan,
  IMPORT_OPERATION_KINDS,
  isDestructive,
  OperationFlag,
  ValidatedOperation,
} from './ImportOperation';
import { isNumberInSource } from './SourceNormalizer';

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
}

export function validateImportPlan({ raw, context, numericTokens }: ValidationInput): ImportPlan {
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
  const createdAssetRefs = new Set<string>();
  const createdLoanRefs = new Set<string>();

  // First pass: collect the refs the plan defines, so a transaction can point
  // at an asset created later in the same list.
  for (const candidate of rawOperations) {
    const record = asRecord(candidate);
    if (!record) continue;
    const ref = asString(record.ref);
    if (!ref) continue;
    if (record.op === 'createAsset') createdAssetRefs.add(ref);
    if (record.op === 'createLoan') createdLoanRefs.add(ref);
  }

  const operations: ValidatedOperation[] = [];

  rawOperations.forEach((candidate, index) => {
    const record = asRecord(candidate);
    if (!record) {
      planWarnings.push(`Operation ${index + 1} was not an object and was dropped.`);
      return;
    }

    const kind = asString(record.op) as ImportOperationKind | undefined;
    if (!kind || !IMPORT_OPERATION_KINDS.includes(kind)) {
      planWarnings.push(
        `Operation ${index + 1} had unknown type "${String(record.op)}" and was dropped.`
      );
      return;
    }

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
      createdAssetRefs,
      createdLoanRefs,
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

    operations.push({
      operation: built.operation,
      flags,
      warnings,
      summary: built.summary,
    });
  });

  return {
    operations,
    warnings: planWarnings,
    sourceSummary: asString(payload.sourceSummary) ?? '',
  };
}

interface BuildArgs {
  kind: ImportOperationKind;
  record: Bag;
  assetIds: Set<number>;
  loanIds: Set<number>;
  createdAssetRefs: Set<string>;
  createdLoanRefs: Set<string>;
  warnings: string[];
  checkProvenance: (value: number | undefined, label: string) => void;
}

function buildOperation(
  args: BuildArgs
): { operation: ImportOperation; summary: string } | undefined {
  const { kind, record, warnings, checkProvenance } = args;

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
    case 'deleteTransaction': {
      const investmentId = asNumber(record.investmentId);
      if (investmentId === undefined) {
        warnings.push('No investmentId given.');
        return undefined;
      }
      return {
        operation: { op: 'deleteTransaction', investmentId },
        summary: `Delete transaction #${investmentId}`,
      };
    }
    case 'addExpense':
      return buildAddExpense(args);
    case 'updateExpense': {
      const expenseId = asNumber(record.expenseId);
      const changes = asRecord(record.changes);
      if (expenseId === undefined || !changes) {
        warnings.push('Needs an expenseId and a changes object.');
        return undefined;
      }
      const amount = asNumber(changes.amount);
      checkProvenance(amount, 'amount');
      return {
        operation: {
          op: 'updateExpense',
          expenseId,
          changes: {
            amount,
            currency: changes.currency ? coerceCurrency(changes.currency, warnings) : undefined,
            date: asString(changes.date),
            category: asString(changes.category),
            isEssential: typeof changes.isEssential === 'boolean' ? changes.isEssential : undefined,
            description: asString(changes.description),
          },
        },
        summary: `Update expense #${expenseId}`,
      };
    }
    case 'deleteExpense': {
      const expenseId = asNumber(record.expenseId);
      if (expenseId === undefined) {
        warnings.push('No expenseId given.');
        return undefined;
      }
      return {
        operation: { op: 'deleteExpense', expenseId },
        summary: `Delete expense #${expenseId}`,
      };
    }
    case 'createLoan':
      return buildCreateLoan(args);
    case 'addLoanPayment':
      return buildAddLoanPayment(args);
    case 'deleteLoanPayment': {
      const paymentId = asNumber(record.paymentId);
      if (paymentId === undefined) {
        warnings.push('No paymentId given.');
        return undefined;
      }
      return {
        operation: { op: 'deleteLoanPayment', paymentId },
        summary: `Delete loan payment #${paymentId}`,
      };
    }
    default:
      return undefined;
  }
}

function buildCreateAsset(args: BuildArgs) {
  const { record, warnings, checkProvenance } = args;

  const ref = asString(record.ref);
  const name = asString(record.name);
  if (!ref || !name) {
    warnings.push('Needs both a ref and a name.');
    return undefined;
  }

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
  checkProvenance(manualValue, 'value');
  checkProvenance(maturityAmount, 'maturity amount');

  const changed = {
    name: asString(changes.name),
    description: asString(changes.description),
    category: changes.category
      ? coerceCategory(changes.category, Object.values(AssetCategory), warnings, 'category')
      : undefined,
    manualValue,
    interestRate: asNumber(changes.interestRate),
    maturityDate: asString(changes.maturityDate),
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
  const assetRef = asString(record.assetRef);

  if (assetId !== undefined && !args.assetIds.has(assetId)) {
    warnings.push(`Asset ${assetId} does not exist.`);
    return undefined;
  }
  if (assetId === undefined && (!assetRef || !args.createdAssetRefs.has(assetRef))) {
    warnings.push(
      `No existing assetId, and assetRef "${assetRef ?? ''}" is not created by this plan.`
    );
    return undefined;
  }

  const rawType = asString(record.type)?.toLowerCase();
  if (rawType !== InvestmentType.BUY && rawType !== InvestmentType.SELL) {
    warnings.push(`Transaction type must be buy or sell, got "${rawType ?? ''}".`);
    return undefined;
  }

  const totalAmount = asNumber(record.totalAmount);
  if (totalAmount === undefined || totalAmount <= 0) {
    warnings.push('Total amount must be a positive number.');
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

  checkProvenance(totalAmount, 'amount');
  checkProvenance(quantity, 'quantity');

  const target = assetId !== undefined ? `asset #${assetId}` : `new asset "${assetRef}"`;
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

  const ref = asString(record.ref);
  const name = asString(record.name);
  const principalAmount = asNumber(record.principalAmount);
  const startDate = parseIsoDate(record.startDate);

  if (!ref || !name) {
    warnings.push('Needs both a ref and a name.');
    return undefined;
  }
  if (principalAmount === undefined || !startDate) {
    warnings.push('Needs a principal amount and a valid start date.');
    return undefined;
  }

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
  const loanRef = asString(record.loanRef);

  if (loanId !== undefined && !args.loanIds.has(loanId)) {
    warnings.push(`Loan ${loanId} does not exist.`);
    return undefined;
  }
  if (loanId === undefined && (!loanRef || !args.createdLoanRefs.has(loanRef))) {
    warnings.push(
      `No existing loanId, and loanRef "${loanRef ?? ''}" is not created by this plan.`
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

  const target = loanId !== undefined ? `loan #${loanId}` : `new loan "${loanRef}"`;

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
