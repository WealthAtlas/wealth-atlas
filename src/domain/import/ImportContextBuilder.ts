import { Asset } from '../entities/assets/Asset';
import { Expense } from '../entities/expenses/Expense';
import { Loan } from '../entities/loans/Loan';

/**
 * The compact picture of the current database sent to the model, so it can
 * decide "attach to existing asset 12" rather than "create a duplicate".
 *
 * Deliberately excludes per-transaction detail — that would balloon the payload
 * and is not needed to match a holdings row to an asset.
 */

export interface AssetContext {
  id: number;
  name: string;
  category: string;
  currency: string;
  totalQty: number;
  lastTransactionDate?: string;
}

export interface LoanContext {
  id: number;
  name: string;
  currency: string;
}

export interface ExistingTransaction {
  assetId: number;
  date: string;
  totalAmount: number;
}

export interface ExistingExpense {
  date: string;
  amount: number;
  description: string;
}

/**
 * An asset an earlier chunk of the same file already asked to create. The model
 * gets these alongside the real assets so it links to the pending one by ref
 * instead of emitting a second `createAsset` for the same instrument.
 */
export interface PendingAsset {
  ref: string;
  name: string;
  category: string;
  currency: string;
}

export interface ImportContext {
  assets: AssetContext[];
  loans: LoanContext[];
  expenseCategories: string[];
  expenseDateRange?: { from: string; to: string };
  /** Used by the validator for duplicate detection, not sent to the model. */
  existingTransactions: ExistingTransaction[];
  existingExpenses: ExistingExpense[];
}

function isoDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function buildImportContext(
  assets: Asset[],
  loans: Loan[],
  expenses: Expense[]
): ImportContext {
  const assetContexts: AssetContext[] = [];
  const existingTransactions: ExistingTransaction[] = [];

  for (const asset of assets) {
    if (asset.id === undefined) continue;

    const transactions = asset.getInvestments(new Date(), false);
    const latest = transactions[transactions.length - 1];

    assetContexts.push({
      id: asset.id,
      name: asset.name,
      category: asset.category,
      currency: asset.currency,
      totalQty: asset.getTotalQty(),
      lastTransactionDate: latest ? isoDate(latest.date) : undefined,
    });

    for (const transaction of transactions) {
      existingTransactions.push({
        assetId: asset.id,
        date: isoDate(transaction.date),
        totalAmount: transaction.totalAmount,
      });
    }
  }

  const expenseDates = expenses
    .map(expense => expense.date)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    assets: assetContexts,
    loans: loans
      .filter(loan => loan.id !== undefined)
      .map(loan => ({ id: loan.id!, name: loan.name, currency: loan.currency })),
    expenseCategories: Array.from(new Set(expenses.map(expense => expense.category))).sort(),
    expenseDateRange:
      expenseDates.length > 0
        ? { from: isoDate(expenseDates[0]), to: isoDate(expenseDates[expenseDates.length - 1]) }
        : undefined,
    existingTransactions,
    existingExpenses: expenses.map(expense => ({
      date: isoDate(expense.date),
      amount: expense.amount,
      description: expense.description,
    })),
  };
}

/** The subset actually sent to the provider — keeps the payload small. */
export function toPromptContext(
  context: ImportContext,
  pendingAssets: PendingAsset[] = []
): string {
  return JSON.stringify(
    {
      assets: context.assets,
      loans: context.loans,
      expenseCategoriesInUse: context.expenseCategories,
      expenseDateRange: context.expenseDateRange,
      ...(pendingAssets.length > 0 ? { assetsBeingCreatedByThisImport: pendingAssets } : {}),
    },
    null,
    2
  );
}
