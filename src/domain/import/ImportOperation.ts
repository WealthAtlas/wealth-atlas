import { InvestmentType } from '../entities/assets/Investment';
import { ValueModel } from '../entities/assets/ValueModel';
import { Currency } from '../entities/shared/Currency';

/**
 * The contract the model must emit. Because schema v4 canonicalised the storage
 * format (totalAmount rather than price, ISO currency codes, sells positive with
 * direction in `type`), this wire shape matches the stored shape one-to-one —
 * the executor does no translation beyond resolving refs and parsing dates.
 *
 * Dates are always `YYYY-MM-DD` strings.
 */

/** Placeholder id the model invents to link rows to an entity it is creating. */
export type EntityRef = string;

export interface CreateAssetOp {
  op: 'createAsset';
  ref: EntityRef;
  name: string;
  category: string;
  currency: Currency;
  valueModel: ValueModel;
  description?: string;
  interestRate?: number;
  maturityDate?: string;
  maturityAmount?: number;
  manualValue?: number;
}

export interface UpdateAssetOp {
  op: 'updateAsset';
  assetId: number;
  changes: {
    name?: string;
    description?: string;
    category?: string;
    manualValue?: number;
    interestRate?: number;
    maturityDate?: string;
    maturityAmount?: number;
  };
}

export interface DeleteAssetOp {
  op: 'deleteAsset';
  assetId: number;
}

export interface AddTransactionOp {
  op: 'addTransaction';
  assetId?: number;
  assetRef?: EntityRef;
  type: InvestmentType;
  quantity?: number;
  /** Total value of the trade, always positive. */
  totalAmount: number;
  date: string;
}

export interface DeleteTransactionOp {
  op: 'deleteTransaction';
  investmentId: number;
}

export interface AddExpenseOp {
  op: 'addExpense';
  amount: number;
  currency: Currency;
  date: string;
  category: string;
  isEssential: boolean;
  description: string;
}

export interface UpdateExpenseOp {
  op: 'updateExpense';
  expenseId: number;
  changes: {
    amount?: number;
    currency?: Currency;
    date?: string;
    category?: string;
    isEssential?: boolean;
    description?: string;
  };
}

export interface DeleteExpenseOp {
  op: 'deleteExpense';
  expenseId: number;
}

export interface CreateLoanOp {
  op: 'createLoan';
  ref: EntityRef;
  name: string;
  principalAmount: number;
  currency: Currency;
  startDate: string;
  description?: string;
}

export interface AddLoanPaymentOp {
  op: 'addLoanPayment';
  loanId?: number;
  loanRef?: EntityRef;
  date: string;
  amount: number;
  description?: string;
}

export interface DeleteLoanPaymentOp {
  op: 'deleteLoanPayment';
  paymentId: number;
}

export type ImportOperation =
  | CreateAssetOp
  | UpdateAssetOp
  | DeleteAssetOp
  | AddTransactionOp
  | DeleteTransactionOp
  | AddExpenseOp
  | UpdateExpenseOp
  | DeleteExpenseOp
  | CreateLoanOp
  | AddLoanPaymentOp
  | DeleteLoanPaymentOp;

export type ImportOperationKind = ImportOperation['op'];

export const IMPORT_OPERATION_KINDS: ImportOperationKind[] = [
  'createAsset',
  'updateAsset',
  'deleteAsset',
  'addTransaction',
  'deleteTransaction',
  'addExpense',
  'updateExpense',
  'deleteExpense',
  'createLoan',
  'addLoanPayment',
  'deleteLoanPayment',
];

export const DESTRUCTIVE_OPERATION_KINDS: ImportOperationKind[] = [
  'deleteAsset',
  'deleteTransaction',
  'deleteExpense',
  'deleteLoanPayment',
];

/** Flags the review screen renders as chips, and uses to pick default selection. */
export type OperationFlag = 'unverified' | 'duplicate' | 'destructive' | 'invalid';

export interface ValidatedOperation {
  operation: ImportOperation;
  flags: OperationFlag[];
  warnings: string[];
  /** Human-readable one-liner for the review list. */
  summary: string;
}

export interface ImportPlan {
  operations: ValidatedOperation[];
  /** Plan-level notes: dropped operations, chunking, truncation. */
  warnings: string[];
  /** Free-text description of the file the model reported. */
  sourceSummary: string;
}

export interface ImportResult {
  applied: number;
  skipped: number;
}

export function isDestructive(kind: ImportOperationKind): boolean {
  return DESTRUCTIVE_OPERATION_KINDS.includes(kind);
}
