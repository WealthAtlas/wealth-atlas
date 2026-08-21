import { ExpenseRepository } from '@/data/repositories/expense/ExpenseRepository';
import { Expense, IExpense } from '../entities/expenses/Expense';
import { MonthlyExpense } from '../entities/expenses/MonthlyExpense';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { monthKey } from '../utils/DateUtils';

/**
 * Spending over a date range, totalled in the base currency.
 *
 * `MonthlyExpense` already knows how to total one month; this groups a filtered
 * set of expenses back into months and reuses those methods, so there is one
 * definition of what a category total means.
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

export interface ExpenseBreakdown {
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
  currency: Currency;
  /** Currencies with no rate, whose expenses contributed 0 to the figures above. */
  unratedCurrencies: Currency[];
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

export function computeExpenseBreakdown(
  monthlyExpenses: MonthlyExpense[],
  converter: CurrencyConverter,
  range: { from?: Date; to?: Date } = {}
): ExpenseBreakdown {
  const expenses = monthlyExpenses
    .flatMap(month => month.expenses)
    .filter(expense => inRange(expense, range.from, range.to));

  const buckets = rebucket(expenses);
  const sumOver = (read: (bucket: MonthlyExpense) => number): number =>
    buckets.reduce((sum, bucket) => sum + read(bucket), 0);

  const total = sumOver(bucket => bucket.getTotalAmount(converter));

  const allCategories = Array.from(new Set(expenses.map(expense => expense.category)));
  const categories: ExpenseCategoryTotal[] = allCategories
    .map(category => {
      const ofCategory = expenses.filter(expense => expense.category === category);
      const categoryBuckets = rebucket(ofCategory);
      const amount = categoryBuckets.reduce(
        (sum, bucket) => sum + bucket.getTotalAmount(converter),
        0
      );
      return {
        category,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        essentialAmount: categoryBuckets.reduce(
          (sum, bucket) => sum + bucket.getEssentialAmount(converter),
          0
        ),
        nonEssentialAmount: categoryBuckets.reduce(
          (sum, bucket) => sum + bucket.getNonEssentialAmount(converter),
          0
        ),
      };
    })
    .sort((a, b) => b.amount - a.amount);

  return {
    total,
    essentialTotal: sumOver(bucket => bucket.getEssentialAmount(converter)),
    nonEssentialTotal: sumOver(bucket => bucket.getNonEssentialAmount(converter)),
    averageMonthlyTotal: buckets.length > 0 ? total / buckets.length : 0,
    expenseCount: expenses.length,
    categories,
    monthly: buckets.map(bucket => ({
      month: monthKey(bucket.month),
      total: bucket.getTotalAmount(converter),
      essential: bucket.getEssentialAmount(converter),
      nonEssential: bucket.getNonEssentialAmount(converter),
    })),
    currency: converter.getBaseCurrency(),
    unratedCurrencies: converter.getUnratedCurrencies(expenses.map(expense => expense.currency)),
  };
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
    converter: CurrencyConverter,
    range: { from?: Date; to?: Date } = {}
  ): Promise<ExpenseBreakdown> {
    return computeExpenseBreakdown(await this.getMonthlyExpenses(), converter, range);
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
