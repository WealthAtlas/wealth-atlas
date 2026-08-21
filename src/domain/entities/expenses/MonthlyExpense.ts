import { Currency } from '../shared/Currency';
import { CurrencyConverter } from '../shared/CurrencyConverter';
import { Expense } from './Expense';

/**
 * A month's expenses, totalled in the base currency.
 *
 * Totals used to be reported per currency, which left the reader adding up two
 * or three columns to know what a month cost. Each expense keeps its own
 * currency for its own row; every sum here converts.
 */
export class MonthlyExpense {
  constructor(
    public month: Date,
    public expenses: Expense[]
  ) {}

  public getTotalAmount(converter: CurrencyConverter): number {
    return this.sum(converter, this.expenses);
  }

  public getEssentialAmount(converter: CurrencyConverter): number {
    return this.sum(
      converter,
      this.expenses.filter(expense => expense.isEssential)
    );
  }

  public getNonEssentialAmount(converter: CurrencyConverter): number {
    return this.sum(
      converter,
      this.expenses.filter(expense => !expense.isEssential)
    );
  }

  public getCategoryTotal(converter: CurrencyConverter, category: string): number {
    return this.sum(
      converter,
      this.expenses.filter(expense => expense.category === category)
    );
  }

  public getAllCategories(): string[] {
    return Array.from(new Set(this.expenses.map(expense => expense.category)));
  }

  /** Currencies spent this month that have no rate, so contributed 0 to the sums. */
  public getUnratedCurrencies(converter: CurrencyConverter): Currency[] {
    return converter.getUnratedCurrencies(this.expenses.map(expense => expense.currency));
  }

  public getSortedExpenses(): Expense[] {
    return this.expenses.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private sum(converter: CurrencyConverter, expenses: Expense[]): number {
    return expenses.reduce(
      (total, expense) => total + converter.toBase(expense.amount, expense.currency),
      0
    );
  }
}
