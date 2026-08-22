import { Currency } from '../shared/Currency';

export interface IExpense {
  id: number | undefined;
  amount: number;
  currency: Currency;
  date: Date;
  category: string;
  isEssential: boolean;
  description: string;
}

export class Expense implements IExpense {
  public readonly id: number | undefined;
  public readonly amount: number;
  public readonly currency: Currency;
  public readonly date: Date;
  public readonly category: string;
  public readonly isEssential: boolean;
  public readonly description: string;

  constructor({ id, amount, currency, date, category, isEssential, description }: IExpense) {
    this.id = id;
    this.amount = amount;
    this.currency = currency;
    this.date = new Date(date);
    this.category = category;
    this.isEssential = isEssential;
    this.description = description;
  }

  public getMonthYear(): string {
    return this.date.getMonth().toString() + ':' + this.date.getFullYear().toString();
  }
}

/**
 * The currencies these expenses were paid in, largest total first, so the
 * currency the user mostly spends in leads every report. Ties fall back to the
 * code, so the order never depends on insertion order.
 *
 * Sorting by a total across currencies is not a comparison of value — no rate is
 * involved — only a way to put the biggest column first.
 */
export function currenciesByTotal(expenses: Expense[]): Currency[] {
  const totals = new Map<Currency, number>();
  for (const expense of expenses) {
    totals.set(expense.currency, (totals.get(expense.currency) ?? 0) + expense.amount);
  }

  return Array.from(totals.keys()).sort(
    (a, b) => (totals.get(b) ?? 0) - (totals.get(a) ?? 0) || a.localeCompare(b)
  );
}
