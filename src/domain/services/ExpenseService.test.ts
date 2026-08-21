import { describe, expect, it } from 'vitest';
import { Expense, IExpense } from '../entities/expenses/Expense';
import { MonthlyExpense } from '../entities/expenses/MonthlyExpense';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { computeExpenseBreakdown } from './ExpenseService';

const USD_RATE = 88;

function converter(rates: Partial<Record<Currency, number>> = {}): CurrencyConverter {
  return new CurrencyConverter(
    Currency.INR,
    new Map(Object.entries(rates) as [Currency, number][])
  );
}

const EXPENSE: IExpense = {
  id: 1,
  amount: 1000,
  currency: Currency.INR,
  date: new Date('2026-06-15'),
  category: 'Groceries',
  isEssential: true,
  description: 'weekly shop',
};

function expense(overrides: Partial<IExpense> = {}): Expense {
  return new Expense({ ...EXPENSE, ...overrides });
}

/** Groups expenses the way `ExpenseService.getMonthlyExpenses` does. */
function months(expenses: Expense[]): MonthlyExpense[] {
  const byMonth = new Map<string, MonthlyExpense>();
  for (const item of expenses) {
    const key = `${item.date.getFullYear()}-${item.date.getMonth()}`;
    let bucket = byMonth.get(key);
    if (!bucket) {
      bucket = new MonthlyExpense(new Date(item.date.getFullYear(), item.date.getMonth()), []);
      byMonth.set(key, bucket);
    }
    bucket.expenses.push(item);
  }
  return Array.from(byMonth.values());
}

describe('computeExpenseBreakdown', () => {
  it('returns zeroed totals for no expenses', () => {
    const breakdown = computeExpenseBreakdown([], converter());

    expect(breakdown.total).toBe(0);
    expect(breakdown.averageMonthlyTotal).toBe(0);
    expect(breakdown.expenseCount).toBe(0);
    expect(breakdown.categories).toEqual([]);
    expect(breakdown.monthly).toEqual([]);
  });

  it('totals every expense and splits essential from non-essential', () => {
    const breakdown = computeExpenseBreakdown(
      months([
        expense({ amount: 1000, isEssential: true }),
        expense({ amount: 400, isEssential: false, category: 'Dining Out' }),
      ]),
      converter()
    );

    expect(breakdown.total).toBe(1400);
    expect(breakdown.essentialTotal).toBe(1000);
    expect(breakdown.nonEssentialTotal).toBe(400);
    expect(breakdown.expenseCount).toBe(2);
    expect(breakdown.currency).toBe(Currency.INR);
  });

  it('reports categories largest first, with each share of the total', () => {
    const breakdown = computeExpenseBreakdown(
      months([
        expense({ amount: 250, category: 'Groceries' }),
        expense({ amount: 750, category: 'Rent' }),
      ]),
      converter()
    );

    expect(breakdown.categories.map(category => category.category)).toEqual(['Rent', 'Groceries']);
    expect(breakdown.categories[0].amount).toBe(750);
    expect(breakdown.categories[0].percentage).toBe(75);
    expect(breakdown.categories[1].percentage).toBe(25);
  });

  it('splits essential and non-essential within a single category', () => {
    const breakdown = computeExpenseBreakdown(
      months([
        expense({ amount: 300, category: 'Travel', isEssential: true }),
        expense({ amount: 200, category: 'Travel', isEssential: false }),
      ]),
      converter()
    );

    const travel = breakdown.categories[0];
    expect(travel.amount).toBe(500);
    expect(travel.essentialAmount).toBe(300);
    expect(travel.nonEssentialAmount).toBe(200);
  });

  it('converts foreign-currency expenses into the base currency', () => {
    const breakdown = computeExpenseBreakdown(
      months([
        expense({ amount: 1000, currency: Currency.INR }),
        expense({ amount: 10, currency: Currency.USD }),
      ]),
      converter({ [Currency.USD]: USD_RATE })
    );

    expect(breakdown.total).toBe(1000 + 10 * USD_RATE);
    expect(breakdown.unratedCurrencies).toEqual([]);
  });

  // An unrated currency converts to 0, which silently understates spending, so
  // the caller has to be told which currencies were left out.
  it('names currencies with no rate, whose expenses counted as zero', () => {
    const breakdown = computeExpenseBreakdown(
      months([
        expense({ amount: 1000, currency: Currency.INR }),
        expense({ amount: 10, currency: Currency.USD }),
      ]),
      converter()
    );

    expect(breakdown.total).toBe(1000);
    expect(breakdown.unratedCurrencies).toEqual([Currency.USD]);
  });

  it('groups by month, most recent first, and averages over months with spending', () => {
    const breakdown = computeExpenseBreakdown(
      months([
        expense({ amount: 100, date: new Date('2026-06-10') }),
        expense({ amount: 300, date: new Date('2026-07-10') }),
      ]),
      converter()
    );

    expect(breakdown.monthly.map(month => month.month)).toEqual(['2026-07', '2026-06']);
    expect(breakdown.monthly[0].total).toBe(300);
    expect(breakdown.averageMonthlyTotal).toBe(200);
  });

  it('excludes expenses outside the range', () => {
    const breakdown = computeExpenseBreakdown(
      months([
        expense({ amount: 100, date: new Date('2026-05-10') }),
        expense({ amount: 300, date: new Date('2026-07-10') }),
      ]),
      converter(),
      { from: new Date('2026-06-01') }
    );

    expect(breakdown.total).toBe(300);
    expect(breakdown.expenseCount).toBe(1);
  });

  // The incoming MonthlyExpense totals the whole month, so a range that cuts a
  // month in half has to be re-bucketed rather than reused.
  it('counts only the in-range part of a month the range cuts through', () => {
    const breakdown = computeExpenseBreakdown(
      months([
        expense({ amount: 100, date: new Date('2026-07-05') }),
        expense({ amount: 300, date: new Date('2026-07-25') }),
      ]),
      converter(),
      { from: new Date('2026-07-10'), to: new Date('2026-07-31') }
    );

    expect(breakdown.total).toBe(300);
    expect(breakdown.monthly).toHaveLength(1);
    expect(breakdown.monthly[0].total).toBe(300);
  });
});
