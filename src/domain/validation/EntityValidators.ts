import { IAsset } from '../entities/assets/Asset';
import { AssetCategory } from '../entities/assets/AssetCategory';
import { IInvestment, InvestmentType } from '../entities/assets/Investment';
import { ISIP } from '../entities/assets/SIP';
import { ValueModel } from '../entities/assets/ValueModel';
import { IExpense } from '../entities/expenses/Expense';
import { IDecisionEntry } from '../entities/journal/DecisionEntry';
import { IMemory, isMemoryKind, MEMORY_TEXT_LIMIT } from '../entities/memory/Memory';
import { IEMI } from '../entities/loans/EMI';
import { ILoan } from '../entities/loans/Loan';
import { IPayment } from '../entities/loans/Payment';
import { isCurrencyCode } from '../entities/shared/Currency';
import { ICurrencyRate } from '../entities/shared/CurrencyRate';
import { ICategoryTarget } from '../entities/shared/Settings';
import { Frequency } from '../entities/shared/Frequency';
import { IScheduleBase } from '../entities/shared/AbstractSchedule';
import { ValidationIssue } from './ValidationIssue';

/**
 * Entity validation lives here rather than in the dialogs so that every write
 * path is held to the same rules — the forms, and the AI import executor which
 * has no form to lean on.
 *
 * These are pure functions returning issues rather than throwing, so a caller
 * can render them inline, list them in an import review, or ignore them.
 */

function isPositiveNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function isUsableDate(value: unknown): value is Date {
  return value instanceof Date && !Number.isNaN(value.getTime());
}

function isKnownFrequency(value: unknown): boolean {
  return (Object.values(Frequency) as unknown[]).includes(value);
}

function validateCurrency(currency: unknown, issues: ValidationIssue[]): void {
  if (!currency) {
    issues.push({ field: 'currency', message: 'Currency is required' });
  } else if (typeof currency !== 'string' || !isCurrencyCode(currency)) {
    issues.push({ field: 'currency', message: `Unsupported currency "${String(currency)}"` });
  }
}

function validateSchedule(schedule: IScheduleBase, issues: ValidationIssue[]): void {
  if (!isUsableDate(schedule.startDate)) {
    issues.push({ field: 'startDate', message: 'A valid start date is required' });
  }
  if (!isKnownFrequency(schedule.frequency)) {
    issues.push({ field: 'frequency', message: 'A valid frequency is required' });
  }
  if (schedule.endDate !== undefined) {
    if (!isUsableDate(schedule.endDate)) {
      issues.push({ field: 'endDate', message: 'End date is not a valid date' });
    } else if (isUsableDate(schedule.startDate) && schedule.endDate < schedule.startDate) {
      issues.push({ field: 'endDate', message: 'End date must be on or after the start date' });
    }
  }
}

export function validateAsset(asset: IAsset): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!asset.name || asset.name.trim() === '') {
    issues.push({ field: 'name', message: 'Name is required' });
  }
  if (!asset.category) {
    issues.push({ field: 'category', message: 'Category is required' });
  }
  validateCurrency(asset.currency, issues);

  if (!asset.valueModel) {
    issues.push({ field: 'valueModel', message: 'Valuation model is required' });
    return issues;
  }

  if (asset.valueModel === ValueModel.FIXED_INCOME && !isPositiveNumber(asset.interestRate)) {
    issues.push({
      field: 'interestRate',
      message: 'Fixed income assets need an interest rate greater than 0',
    });
  }

  if (asset.valueModel === ValueModel.MATURITY_BASED) {
    if (!isUsableDate(asset.maturityDate)) {
      issues.push({ field: 'maturityDate', message: 'Maturity-based assets need a maturity date' });
    }
    if (!isPositiveNumber(asset.maturityAmount)) {
      issues.push({
        field: 'maturityAmount',
        message: 'Maturity-based assets need a maturity amount greater than 0',
      });
    }
  }

  return issues;
}

export function validateInvestment(investment: IInvestment): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isPositiveNumber(investment.totalAmount)) {
    issues.push({ field: 'totalAmount', message: 'Amount must be greater than 0' });
  }
  if (!isUsableDate(investment.date)) {
    issues.push({ field: 'date', message: 'A valid date is required' });
  }
  if (!Object.values(InvestmentType).includes(investment.type)) {
    issues.push({ field: 'type', message: 'Transaction type must be buy or sell' });
  }
  if (investment.quantity !== undefined && investment.quantity < 0) {
    issues.push({
      field: 'quantity',
      message: 'Quantity must be positive — use type "sell" to reduce a holding',
    });
  }
  if (!investment.assetId) {
    issues.push({ field: 'assetId', message: 'Transaction must belong to an asset' });
  }

  return issues;
}

export function validateSIP(sip: ISIP): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isPositiveNumber(sip.price)) {
    issues.push({ field: 'price', message: 'Amount must be greater than 0' });
  }
  if (!sip.assetId) {
    issues.push({ field: 'assetId', message: 'SIP must belong to an asset' });
  }
  validateSchedule(sip, issues);

  return issues;
}

export function validateExpense(expense: IExpense): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isPositiveNumber(expense.amount)) {
    issues.push({ field: 'amount', message: 'Amount must be greater than 0' });
  }
  validateCurrency(expense.currency, issues);
  if (!isUsableDate(expense.date)) {
    issues.push({ field: 'date', message: 'A valid date is required' });
  }
  if (!expense.category) {
    issues.push({ field: 'category', message: 'Category is required' });
  }

  return issues;
}

export function validateLoan(loan: ILoan): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!loan.name || loan.name.trim() === '') {
    issues.push({ field: 'name', message: 'Name is required' });
  }
  if (!isPositiveNumber(loan.principalAmount)) {
    issues.push({ field: 'principalAmount', message: 'Principal must be greater than 0' });
  }
  validateCurrency(loan.currency, issues);
  if (!isUsableDate(loan.startDate)) {
    issues.push({ field: 'startDate', message: 'A valid start date is required' });
  }

  return issues;
}

export function validatePayment(payment: IPayment): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isPositiveNumber(payment.amount)) {
    issues.push({ field: 'amount', message: 'Amount must be greater than 0' });
  }
  if (!isUsableDate(payment.date)) {
    issues.push({ field: 'date', message: 'A valid date is required' });
  }
  if (!payment.loanId) {
    issues.push({ field: 'loanId', message: 'Payment must belong to a loan' });
  }

  return issues;
}

export function validateCurrencyRate(rate: ICurrencyRate): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  validateCurrency(rate.code, issues);

  const hasManual = rate.manualPerUnitInBase !== undefined;
  const hasScript = Boolean(rate.script && rate.script.trim() !== '');

  if (hasManual && !isPositiveNumber(rate.manualPerUnitInBase)) {
    issues.push({ field: 'manualPerUnitInBase', message: 'Rate must be greater than 0' });
  }
  if (!hasManual && !hasScript) {
    issues.push({
      field: 'manualPerUnitInBase',
      message: 'Enter a rate or a script that fetches one',
    });
  }

  return issues;
}

export function validateEMI(emi: IEMI): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!emi.name || emi.name.trim() === '') {
    issues.push({ field: 'name', message: 'Name is required' });
  }
  if (!isPositiveNumber(emi.amount)) {
    issues.push({ field: 'amount', message: 'Amount must be greater than 0' });
  }
  if (!emi.loanId) {
    issues.push({ field: 'loanId', message: 'Schedule must belong to a loan' });
  }
  validateSchedule(emi, issues);

  return issues;
}

/**
 * The target allocation, validated as a whole rather than row by row: the
 * shares only mean anything relative to each other, so "does this add up" is
 * the rule that matters and it cannot be checked one entry at a time.
 *
 * An empty allocation is valid — it is the state of having no policy yet, not a
 * broken one.
 */
export function validateTargetAllocation(targets: ICategoryTarget[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const known = new Set<string>(Object.values(AssetCategory));
  const seen = new Set<string>();

  targets.forEach(target => {
    if (!target.category) {
      issues.push({ field: 'category', message: 'Every target needs a category' });
      return;
    }
    if (!known.has(target.category)) {
      issues.push({
        field: 'category',
        message: `"${target.category}" is not an asset category`,
      });
    }
    if (seen.has(target.category)) {
      issues.push({
        field: 'category',
        message: `"${target.category}" has more than one target`,
      });
    }
    seen.add(target.category);

    if (
      typeof target.targetPercent !== 'number' ||
      !Number.isFinite(target.targetPercent) ||
      target.targetPercent < 0 ||
      target.targetPercent > 100
    ) {
      issues.push({
        field: 'targetPercent',
        message: `Target for "${target.category}" must be between 0 and 100`,
      });
    }

    if (
      target.bandPercent !== undefined &&
      (!Number.isFinite(target.bandPercent) || target.bandPercent < 0 || target.bandPercent > 100)
    ) {
      issues.push({
        field: 'bandPercent',
        message: `Band for "${target.category}" must be between 0 and 100`,
      });
    }
  });

  const total = targets.reduce(
    (sum, target) => sum + (Number.isFinite(target.targetPercent) ? target.targetPercent : 0),
    0
  );

  // Over 100 is impossible to hold and would make every drift wrong. Under 100
  // is allowed but flagged: a policy covering 80% of the portfolio leaves the
  // rest undirected, which is a decision worth seeing rather than an error.
  if (targets.length > 0 && Math.round(total * 100) / 100 > 100) {
    issues.push({
      field: 'targetPercent',
      message: `Targets add up to ${Math.round(total * 100) / 100}%, which is more than 100%`,
    });
  }

  return issues;
}

const DECISION_ACTIONS = ['buy', 'sell', 'hold'];
const DECISION_STATUSES = ['proposed', 'acted', 'declined'];

/**
 * A journal entry is only worth keeping if it records *why*. An entry with an
 * empty rationale is a trade log line, and a trade log cannot be reviewed for
 * whether the thinking held up — which is the entire purpose of the journal.
 */
export function validateDecisionEntry(entry: IDecisionEntry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isUsableDate(entry.createdAt)) {
    issues.push({ field: 'createdAt', message: 'A valid date is required' });
  }
  if (!entry.category || typeof entry.category !== 'string') {
    issues.push({ field: 'category', message: 'A category is required' });
  } else if (!(Object.values(AssetCategory) as string[]).includes(entry.category)) {
    issues.push({ field: 'category', message: `"${entry.category}" is not an asset category` });
  }
  if (!DECISION_ACTIONS.includes(entry.action)) {
    issues.push({ field: 'action', message: 'Action must be buy, sell or hold' });
  }
  if (!DECISION_STATUSES.includes(entry.status)) {
    issues.push({ field: 'status', message: 'Status must be proposed, acted or declined' });
  }
  if (!entry.rationale || entry.rationale.trim() === '') {
    issues.push({
      field: 'rationale',
      message: 'Say why — an entry with no reasoning cannot be reviewed',
    });
  }

  validateCurrency(entry.currency, issues);

  if (entry.amount !== undefined && !isPositiveNumber(entry.amount)) {
    issues.push({ field: 'amount', message: 'Amount must be a positive number when given' });
  }
  // A trade that moved money but recorded none leaves the journal unable to say
  // how much the decision was worth being right about.
  if (entry.status === 'acted' && entry.action !== 'hold' && entry.amount === undefined) {
    issues.push({ field: 'amount', message: 'Record how much was moved' });
  }

  return issues;
}

/**
 * A memory reaches this from two directions: the Settings editor, and the
 * background curator, whose output is untrusted model text in exactly the way an
 * import plan is. Both go through here, which is the whole reason validation
 * lives in this file rather than in a dialog.
 *
 * Length is a real rule, not a formality. A memory is one statement, and the
 * entire set is pasted into every system prompt — a model that writes a
 * paragraph is both storing two facts in one row and crowding out the rules
 * around it.
 */
export function validateMemory(memory: IMemory): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!isMemoryKind(memory.kind)) {
    issues.push({ field: 'kind', message: 'Pick what kind of memory this is' });
  }

  const text = typeof memory.text === 'string' ? memory.text.trim() : '';
  if (text === '') {
    issues.push({ field: 'text', message: 'Say what should be remembered' });
  } else if (text.length > MEMORY_TEXT_LIMIT) {
    issues.push({
      field: 'text',
      message: `Keep it to one statement of ${MEMORY_TEXT_LIMIT} characters or fewer`,
    });
  }

  if (memory.source !== 'assistant' && memory.source !== 'user') {
    issues.push({ field: 'source', message: 'Source must be assistant or user' });
  }

  if (!isUsableDate(memory.createdAt)) {
    issues.push({ field: 'createdAt', message: 'A valid created date is required' });
  }
  if (!isUsableDate(memory.updatedAt)) {
    issues.push({ field: 'updatedAt', message: 'A valid updated date is required' });
  }

  return issues;
}
