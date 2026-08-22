import { describe, expect, it } from 'vitest';
import { Currency } from '../shared/Currency';
import { Expense, IExpense } from './Expense';
import { MonthlyExpense } from './MonthlyExpense';

function expense(
  amount: number,
  currency: Currency,
  isEssential = true,
  category = 'Groceries'
): Expense {
  const row: IExpense = {
    id: undefined,
    amount,
    currency,
    date: new Date('2026-06-15'),
    category,
    isEssential,
    description: 'x',
  };
  return new Expense(row);
}

function month(expenses: Expense[]): MonthlyExpense {
  return new MonthlyExpense(new Date(2026, 5), expenses);
}

describe('MonthlyExpense', () => {
  // The whole point of the per-currency shape: nothing is converted, so a
  // foreign expense never lands in another currency's total.
  it('totals each currency on its own, never across them', () => {
    const monthly = month([expense(1000, Currency.INR), expense(50, Currency.USD)]);

    expect(monthly.getTotalAmount(Currency.INR)).toBe(1000);
    expect(monthly.getTotalAmount(Currency.USD)).toBe(50);
  });

  it('reports the currencies spent in, largest total first', () => {
    const monthly = month([
      expense(50, Currency.USD),
      expense(1000, Currency.INR),
      expense(20, Currency.GBP),
    ]);

    expect(monthly.getCurrencies()).toEqual([Currency.INR, Currency.USD, Currency.GBP]);
  });

  it('orders currencies with equal totals by code, so the order is stable', () => {
    const monthly = month([expense(100, Currency.USD), expense(100, Currency.GBP)]);

    expect(monthly.getCurrencies()).toEqual([Currency.GBP, Currency.USD]);
  });

  it('splits essential from non-essential within a currency', () => {
    const monthly = month([
      expense(1000, Currency.INR, true),
      expense(400, Currency.INR, false),
      expense(50, Currency.USD, false),
    ]);

    expect(monthly.getEssentialAmount(Currency.INR)).toBe(1000);
    expect(monthly.getNonEssentialAmount(Currency.INR)).toBe(400);
    expect(monthly.getEssentialAmount(Currency.USD)).toBe(0);
    expect(monthly.getNonEssentialAmount(Currency.USD)).toBe(50);
  });

  it('adds essential and non-essential back to the currency total', () => {
    const monthly = month([expense(1000, Currency.INR, true), expense(400, Currency.INR, false)]);

    expect(
      monthly.getEssentialAmount(Currency.INR) + monthly.getNonEssentialAmount(Currency.INR)
    ).toBe(monthly.getTotalAmount(Currency.INR));
  });

  it('totals a category within one currency only', () => {
    const monthly = month([
      expense(1000, Currency.INR, true, 'Rent'),
      expense(50, Currency.USD, true, 'Rent'),
      expense(300, Currency.INR, true, 'Groceries'),
    ]);

    expect(monthly.getCategoryTotal(Currency.INR, 'Rent')).toBe(1000);
    expect(monthly.getCategoryTotal(Currency.USD, 'Rent')).toBe(50);
    expect(monthly.getCategoryTotal(Currency.INR, 'Groceries')).toBe(300);
  });

  it('lists only the categories spent in, per currency', () => {
    const monthly = month([
      expense(100, Currency.INR, true, 'Rent'),
      expense(200, Currency.INR, true, 'Rent'),
      expense(300, Currency.INR, true, 'Groceries'),
      expense(40, Currency.USD, true, 'Travel'),
    ]);

    expect(monthly.getCategories(Currency.INR).sort()).toEqual(['Groceries', 'Rent']);
    expect(monthly.getCategories(Currency.USD)).toEqual(['Travel']);
  });

  it('reports zero for a currency that was not spent in', () => {
    const monthly = month([expense(1000, Currency.INR)]);

    expect(monthly.getCurrencies()).toEqual([Currency.INR]);
    expect(monthly.getTotalAmount(Currency.USD)).toBe(0);
  });

  it('handles a month with no expenses', () => {
    const monthly = month([]);

    expect(monthly.getCurrencies()).toEqual([]);
    expect(monthly.getTotalAmount(Currency.INR)).toBe(0);
  });
});
