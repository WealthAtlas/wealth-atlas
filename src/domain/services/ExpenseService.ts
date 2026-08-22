import { ExpenseRepository } from '@/data/repositories/expense/ExpenseRepository';
import { currenciesByTotal, Expense, IExpense } from '../entities/expenses/Expense';
import { MonthlyExpense } from '../entities/expenses/MonthlyExpense';
import { Currency } from '../entities/shared/Currency';
import { monthKey } from '../utils/DateUtils';

/**
 * Spending over a date range, reported once per currency spent in.
 *
 * Nothing converts here — see `MonthlyExpense` for why an expense is left in
 * the currency it was paid in. `MonthlyExpense` already knows how to total one
 * month in one currency; this groups a filtered set of expenses back into
 * months and reuses those methods, so there is one definition of what a
 * category total means.
 */
export interface ExpenseCategoryTotal {
  category: string;
  amount: number;
  /** Share of `total`. */
  percentage: number;
  essentialAmount: number;
  nonEssentialAmount: number;
}

export interface ExpenseMonthTotal {
  /** YYYY-MM. */
  month: string;
  total: number;
  essential: number;
  nonEssential: number;
}

/** Every figure below is in `currency`, and only counts expenses paid in it. */
export interface ExpenseBreakdown {
  currency: Currency;
  total: number;
  essentialTotal: number;
  nonEssentialTotal: number;
  /** `total` divided by the number of months that actually had spending. */
  averageMonthlyTotal: number;
  expenseCount: number;
  /** Largest share first. */
  categories: ExpenseCategoryTotal[];
  /** Most recent month first. */
  monthly: ExpenseMonthTotal[];
}

function inRange(expense: Expense, from?: Date, to?: Date): boolean {
  if (from && expense.date.getTime() < from.getTime()) return false;
  if (to && expense.date.getTime() > to.getTime()) return false;
  return true;
}

/**
 * Rebuckets by month rather than reusing the incoming months, because a range
 * can cut a month in half and the original `MonthlyExpense` would still total
 * all of it. Every bucket keeps its real month, so its own totals stay valid.
 */
function rebucket(expenses: Expense[]): MonthlyExpense[] {
  const byMonth = new Map<string, MonthlyExpense>();

  for (const expense of expenses) {
    const key = monthKey(expense.date);
    let bucket = byMonth.get(key);
    if (!bucket) {
      bucket = new MonthlyExpense(
        new Date(expense.date.getFullYear(), expense.date.getMonth()),
        []
      );
      byMonth.set(key, bucket);
    }
    bucket.expenses.push(expense);
  }

  return Array.from(byMonth.values()).sort((a, b) => b.month.getTime() - a.month.getTime());
}

/** The currencies spent in across every month given, largest total first. */
export function expenseCurrencies(monthlyExpenses: MonthlyExpense[]): Currency[] {
  return currenciesByTotal(monthlyExpenses.flatMap(month => month.expenses));
}

function breakdownFor(expenses: Expense[], currency: Currency): ExpenseBreakdown {
  const ofCurrency = expenses.filter(expense => expense.currency === currency);
  const buckets = rebucket(ofCurrency);
  const sumOver = (read: (bucket: MonthlyExpense) => number): number =>
    buckets.reduce((sum, bucket) => sum + read(bucket), 0);

  const total = sumOver(bucket => bucket.getTotalAmount(currency));

  const allCategories = Array.from(new Set(ofCurrency.map(expense => expense.category)));
  const categories: ExpenseCategoryTotal[] = allCategories
    .map(category => {
      const categoryBuckets = rebucket(ofCurrency.filter(expense => expense.category === category));
      const amount = categoryBuckets.reduce(
        (sum, bucket) => sum + bucket.getTotalAmount(currency),
        0
      );
      return {
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        essentialAmount: categoryBuckets.reduce(
          (sum, bucket) => sum + bucket.getEssentialAmount(currency),
          0
        ),
        nonEssentialAmount: categoryBuckets.reduce(
          (sum, bucket) => sum + bucket.getNonEssentialAmount(currency),
          0
        ),
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    currency,
    total,
    essentialTotal: sumOver(bucket => bucket.getEssentialAmount(currency)),
    nonEssentialTotal: sumOver(bucket => bucket.getNonEssentialAmount(currency)),
    averageMonthlyTotal: buckets.length > 0 ? total / buckets.length : 0,
    expenseCount: ofCurrency.length,
    categories,
    monthly: buckets.map(bucket => ({
      month: monthKey(bucket.month),
      total: bucket.getTotalAmount(currency),
      essential: bucket.getEssentialAmount(currency),
      nonEssential: bucket.getNonEssentialAmount(currency),
    })),
  };
}

/**
 * One breakdown per currency spent in over the range, largest total first. An
 * empty range yields an empty list rather than a zeroed report in some assumed
 * currency: there is no currency to name.
 */
export function computeExpenseBreakdown(
  monthlyExpenses: MonthlyExpense[],
  range: { from?: Date; to?: Date } = {}
): ExpenseBreakdown[] {
  const expenses = monthlyExpenses
    .flatMap(month => month.expenses)
    .filter(expense => inRange(expense, range.from, range.to));

  return currenciesByTotal(expenses).map(currency => breakdownFor(expenses, currency));
}

export class ExpenseService {
  private readonly expenseRepository: ExpenseRepository;

  constructor() {
    this.expenseRepository = new ExpenseRepository();
  }

  public async createExpense(expense: IExpense): Promise<Expense> {
    return await this.expenseRepository.create(expense).then(this.toExpense);
  }

  public async getExpenseById(id: number): Promise<Expense> {
    return await this.expenseRepository.getById(id).then(this.toExpense);
  }

  public async getExpenses(): Promise<Expense[]> {
    return await this.expenseRepository.getAll().then(async expenses => {
      const expensePromises = expenses.map(expense => this.toExpense(expense));
      return (await Promise.all(expensePromises)).sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );
    });
  }

  public async getMonthlyExpenses(): Promise<MonthlyExpense[]> {
    const expenses = await this.expenseRepository.getAll();
    const resolvedExpenses = await Promise.all(expenses.map(expense => this.toExpense(expense)));

    const monthlyExpensesMap = new Map<string, MonthlyExpense>();

    resolvedExpenses.forEach(expense => {
      const key = this.generateMonthlyExpenseKey(expense);

      if (!monthlyExpensesMap.has(key)) {
        monthlyExpensesMap.set(
          key,
          new MonthlyExpense(new Date(expense.date.getFullYear(), expense.date.getMonth()), [])
        );
      }

      monthlyExpensesMap.get(key)?.expenses.push(expense);
    });

    return Array.from(monthlyExpensesMap.values()).sort(
      (a, b) => b.month.getTime() - a.month.getTime()
    );
  }

  public async getExpenseBreakdown(
    range: { from?: Date; to?: Date } = {}
  ): Promise<ExpenseBreakdown[]> {
    return computeExpenseBreakdown(await this.getMonthlyExpenses(), range);
  }

  private generateMonthlyExpenseKey(expense: Expense): string {
    return monthKey(expense.date);
  }

  public async updateExpense(expense: IExpense): Promise<Expense> {
    return await this.expenseRepository.update(expense).then(this.toExpense);
  }

  public async deleteExpense(id: number): Promise<void> {
    await this.expenseRepository.delete(id);
  }

  private async toExpense(expense: IExpense): Promise<Expense> {
    return new Expense(expense);
  }
}
