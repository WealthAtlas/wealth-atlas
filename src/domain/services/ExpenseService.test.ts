import { describe, expect, it } from 'vitest';
import { Expense, IExpense } from '../entities/expenses/Expense';
import { MonthlyExpense } from '../entities/expenses/MonthlyExpense';
import { Currency } from '../entities/shared/Currency';
import { computeExpenseBreakdown, expenseCurrencies } from './ExpenseService';

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

/** The only currency in play in most of these, so read it without indexing twice. */
function only(breakdowns: ReturnType<typeof computeExpenseBreakdown>) {
  expect(breakdowns).toHaveLength(1);
  return breakdowns[0];
}

describe('computeExpenseBreakdown', () => {
  // No expenses means no currency to name, so there is nothing to report — a
  // zeroed report would have to invent a currency to label itself with.
  it('reports nothing at all for no expenses', () => {
    expect(computeExpenseBreakdown([])).toEqual([]);
  });

  it('totals every expense and splits essential from non-essential', () => {
    const breakdown = only(
      computeExpenseBreakdown(
        months([
          expense({ amount: 1000, isEssential: true }),
          expense({ amount: 400, isEssential: false, category: 'Dining Out' }),
        ])
      )
    );

    expect(breakdown.total).toBe(1400);
    expect(breakdown.essentialTotal).toBe(1000);
    expect(breakdown.nonEssentialTotal).toBe(400);
    expect(breakdown.expenseCount).toBe(2);
    expect(breakdown.currency).toBe(Currency.INR);
  });

  it('reports categories largest first, with each share of the total', () => {
    const breakdown = only(
      computeExpenseBreakdown(
        months([
          expense({ amount: 250, category: 'Groceries' }),
          expense({ amount: 750, category: 'Rent' }),
        ])
      )
    );

    expect(breakdown.categories.map(category => category.category)).toEqual(['Rent', 'Groceries']);
    expect(breakdown.categories[0].amount).toBe(750);
    expect(breakdown.categories[0].percentage).toBe(75);
    expect(breakdown.categories[1].percentage).toBe(25);
  });

  it('splits essential and non-essential within a single category', () => {
    const breakdown = only(
      computeExpenseBreakdown(
        months([
          expense({ amount: 300, category: 'Travel', isEssential: true }),
          expense({ amount: 200, category: 'Travel', isEssential: false }),
        ])
      )
    );

    const travel = breakdown.categories[0];
    expect(travel.amount).toBe(500);
    expect(travel.essentialAmount).toBe(300);
    expect(travel.nonEssentialAmount).toBe(200);
  });

  // The reason this shape exists. An expense is a settled outflow, so it is
  // reported in the currency it was paid in and never blended at today's rate.
  it('reports one breakdown per currency, largest first, with nothing converted', () => {
    const breakdowns = computeExpenseBreakdown(
      months([
        expense({ amount: 1000, currency: Currency.INR }),
        expense({ amount: 10, currency: Currency.USD }),
      ])
    );

    expect(breakdowns.map(breakdown => breakdown.currency)).toEqual([Currency.INR, Currency.USD]);
    expect(breakdowns[0].total).toBe(1000);
    expect(breakdowns[1].total).toBe(10);
  });

  it('keeps each currency’s categories and shares to itself', () => {
    const breakdowns = computeExpenseBreakdown(
      months([
        expense({ amount: 600, currency: Currency.INR, category: 'Rent' }),
        expense({ amount: 400, currency: Currency.INR, category: 'Groceries' }),
        expense({ amount: 10, currency: Currency.USD, category: 'Travel' }),
      ])
    );

    const inr = breakdowns[0];
    const usd = breakdowns[1];

    expect(inr.categories.map(category => category.category)).toEqual(['Rent', 'Groceries']);
    expect(inr.categories[0].percentage).toBe(60);
    expect(usd.categories.map(category => category.category)).toEqual(['Travel']);
    expect(usd.categories[0].percentage).toBe(100);
    expect(usd.expenseCount).toBe(1);
  });

  it('groups by month, most recent first, and averages over months with spending', () => {
    const breakdown = only(
      computeExpenseBreakdown(
        months([
          expense({ amount: 100, date: new Date('2026-06-10') }),
          expense({ amount: 300, date: new Date('2026-07-10') }),
        ])
      )
    );

    expect(breakdown.monthly.map(month => month.month)).toEqual(['2026-07', '2026-06']);
    expect(breakdown.monthly[0].total).toBe(300);
    expect(breakdown.averageMonthlyTotal).toBe(200);
  });

  // A currency's average is over the months it was actually spent in, not over
  // every month on record — an untouched month would drag it down.
  it('averages each currency over its own months', () => {
    const breakdowns = computeExpenseBreakdown(
      months([
        expense({ amount: 100, date: new Date('2026-06-10'), currency: Currency.INR }),
        expense({ amount: 300, date: new Date('2026-07-10'), currency: Currency.INR }),
        expense({ amount: 40, date: new Date('2026-07-10'), currency: Currency.USD }),
      ])
    );

    expect(breakdowns[0].averageMonthlyTotal).toBe(200);
    expect(breakdowns[1].averageMonthlyTotal).toBe(40);
    expect(breakdowns[1].monthly).toHaveLength(1);
  });

  it('excludes expenses outside the range', () => {
    const breakdown = only(
      computeExpenseBreakdown(
        months([
          expense({ amount: 100, date: new Date('2026-05-10') }),
          expense({ amount: 300, date: new Date('2026-07-10') }),
        ]),
        { from: new Date('2026-06-01') }
      )
    );

    expect(breakdown.total).toBe(300);
    expect(breakdown.expenseCount).toBe(1);
  });

  // A currency whose only spending falls outside the range drops out entirely,
  // rather than appearing as a zero row.
  it('drops a currency with nothing in range', () => {
    const breakdowns = computeExpenseBreakdown(
      months([
        expense({ amount: 300, date: new Date('2026-07-10'), currency: Currency.INR }),
        expense({ amount: 40, date: new Date('2026-05-10'), currency: Currency.USD }),
      ]),
      { from: new Date('2026-06-01') }
    );

    expect(breakdowns.map(breakdown => breakdown.currency)).toEqual([Currency.INR]);
  });

  // The incoming MonthlyExpense totals the whole month, so a range that cuts a
  // month in half has to be re-bucketed rather than reused.
  it('counts only the in-range part of a month the range cuts through', () => {
    const breakdown = only(
      computeExpenseBreakdown(
        months([
          expense({ amount: 100, date: new Date('2026-07-05') }),
          expense({ amount: 300, date: new Date('2026-07-25') }),
        ]),
        { from: new Date('2026-07-10'), to: new Date('2026-07-31') }
      )
    );

    expect(breakdown.total).toBe(300);
    expect(breakdown.monthly).toHaveLength(1);
    expect(breakdown.monthly[0].total).toBe(300);
  });
});

describe('expenseCurrencies', () => {
  it('spans every month, largest total first', () => {
    const currencies = expenseCurrencies(
      months([
        expense({ amount: 40, date: new Date('2026-06-10'), currency: Currency.USD }),
        expense({ amount: 30, date: new Date('2026-07-10'), currency: Currency.USD }),
        expense({ amount: 60, date: new Date('2026-07-10'), currency: Currency.INR }),
      ])
    );

    // 70 USD beats 60 INR on the raw figures; no rate is consulted, and none is
    // implied — this only decides which column is shown first.
    expect(currencies).toEqual([Currency.USD, Currency.INR]);
  });

  it('is empty when there are no expenses', () => {
    expect(expenseCurrencies([])).toEqual([]);
  });
});
