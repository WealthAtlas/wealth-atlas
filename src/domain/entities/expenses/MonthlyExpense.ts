import { Currency } from '../shared/Currency';
import { currenciesByTotal, Expense } from './Expense';

/**
 * A month's expenses, reported once per currency.
 *
 * Nothing here converts, deliberately. An expense is a settled outflow rather
 * than a holding: it does not grow, and no ratio spans two of them, so there is
 * nothing that only reads correctly on a common basis. Restating last year's
 * rupees at today's dollar rate would invent a figure the user never spent.
 * Conversion belongs to assets, loans and goals, where both sides of a ratio
 * move at the same rate and a single total is the point.
 *
 * A month spent in two currencies therefore has two totals, and the caller
 * shows both rather than adding them.
 */
export class MonthlyExpense {
  constructor(
    public month: Date,
    public expenses: Expense[]
  ) {}

  /** Currencies spent this month, largest total first so the dominant one leads. */
  public getCurrencies(): Currency[] {
    return currenciesByTotal(this.expenses);
  }

  public getTotalAmount(currency: Currency): number {
    return this.sum(currency, () => true);
  }

  public getEssentialAmount(currency: Currency): number {
    return this.sum(currency, expense => expense.isEssential);
  }

  public getNonEssentialAmount(currency: Currency): number {
    return this.sum(currency, expense => !expense.isEssential);
  }

  public getCategoryTotal(currency: Currency, category: string): number {
    return this.sum(currency, expense => expense.category === category);
  }

  /** Categories spent in, in the given currency. */
  public getCategories(currency: Currency): string[] {
    return Array.from(
      new Set(
        this.expenses
          .filter(expense => expense.currency === currency)
          .map(expense => expense.category)
      )
    );
  }

  public getSortedExpenses(): Expense[] {
    return this.expenses.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  private sum(currency: Currency, keep: (expense: Expense) => boolean): number {
    return this.expenses
      .filter(expense => expense.currency === currency && keep(expense))
      .reduce((total, expense) => total + expense.amount, 0);
  }
}
