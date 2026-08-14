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
 *
 * Every operation addresses an existing row by an id the model was actually
 * shown: asset ids and loan ids, which `ImportContextBuilder` sends. There is
 * deliberately no operation keyed on an investment, expense or payment id —
 * those ids are never in the prompt, so any the model produced would be
 * invented, and an invented id can collide with a real row.
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

export interface AddExpenseOp {
  op: 'addExpense';
  amount: number;
  currency: Currency;
  date: string;
  category: string;
  isEssential: boolean;
  description: string;
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

export type ImportOperation =
  | CreateAssetOp
  | UpdateAssetOp
  | DeleteAssetOp
  | AddTransactionOp
  | AddExpenseOp
  | CreateLoanOp
  | AddLoanPaymentOp;

export type ImportOperationKind = ImportOperation['op'];

export const IMPORT_OPERATION_KINDS: ImportOperationKind[] = [
  'createAsset',
  'updateAsset',
  'deleteAsset',
  'addTransaction',
  'addExpense',
  'createLoan',
  'addLoanPayment',
];

export const DESTRUCTIVE_OPERATION_KINDS: ImportOperationKind[] = ['deleteAsset'];

/** Operations that create an entity later operations can attach to by ref. */
export const CREATE_OPERATION_KINDS: ImportOperationKind[] = ['createAsset', 'createLoan'];

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

export function isCreate(operation: ImportOperation): boolean {
  return CREATE_OPERATION_KINDS.includes(operation.op);
}

/**
 * Refs are namespaced by entity kind so an asset and a loan that happen to share
 * a placeholder id never resolve to each other.
 */
export function definesRef(operation: ImportOperation): string | undefined {
  if (operation.op === 'createAsset') return `asset:${operation.ref}`;
  if (operation.op === 'createLoan') return `loan:${operation.ref}`;
  return undefined;
}

/**
 * The ref of an entity created elsewhere in the same plan that this operation
 * needs. Applying the child without its parent cannot resolve, so the review
 * screen keeps the two selected together.
 */
export function dependsOnRef(operation: ImportOperation): string | undefined {
  if (operation.op === 'addTransaction' && operation.assetId === undefined && operation.assetRef) {
    return `asset:${operation.assetRef}`;
  }
  if (operation.op === 'addLoanPayment' && operation.loanId === undefined && operation.loanRef) {
    return `loan:${operation.loanRef}`;
  }
  return undefined;
}
