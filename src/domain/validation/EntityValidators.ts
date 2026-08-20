import { IAsset } from '../entities/assets/Asset';
import { IInvestment, InvestmentType } from '../entities/assets/Investment';
import { ISIP } from '../entities/assets/SIP';
import { ValueModel } from '../entities/assets/ValueModel';
import { IExpense } from '../entities/expenses/Expense';
import { IEMI } from '../entities/loans/EMI';
import { ILoan } from '../entities/loans/Loan';
import { IPayment } from '../entities/loans/Payment';
import { isCurrencyCode } from '../entities/shared/Currency';
import { ICurrencyRate } from '../entities/shared/CurrencyRate';
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
