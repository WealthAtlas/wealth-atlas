import { describe, expect, it } from 'vitest';
import { Currency } from '../shared/Currency';
import { CurrencyConverter } from '../shared/CurrencyConverter';
import { Expense } from './Expense';
import { MonthlyExpense } from './MonthlyExpense';

const USD_RATE = 88;

const converter = new CurrencyConverter(Currency.INR, new Map([[Currency.USD, USD_RATE]]));

function expense(
  amount: number,
  currency: Currency,
  isEssential = true,
  category = 'Groceries'
): Expense {
  return new Expense({
    id: undefined,
    amount,
    currency,
    date: new Date('2026-08-10'),
    category,
    isEssential,
    description: '',
  });
}

function month(expenses: Expense[]): MonthlyExpense {
  return new MonthlyExpense(new Date('2026-08-01'), expenses);
}

describe('MonthlyExpense totals', () => {
  it('adds expenses across currencies into the base currency', () => {
    const monthly = month([expense(1000, Currency.INR), expense(50, Currency.USD)]);

    expect(monthly.getTotalAmount(converter)).toBe(1000 + 50 * USD_RATE);
  });

  it('splits essential from non-essential after converting', () => {
    const monthly = month([
      expense(1000, Currency.INR, true),
      expense(50, Currency.USD, true),
      expense(20, Currency.USD, false),
    ]);

    expect(monthly.getEssentialAmount(converter)).toBe(1000 + 50 * USD_RATE);
    expect(monthly.getNonEssentialAmount(converter)).toBe(20 * USD_RATE);
    expect(monthly.getEssentialAmount(converter) + monthly.getNonEssentialAmount(converter)).toBe(
      monthly.getTotalAmount(converter)
    );
  });

  it('totals one category across the currencies it was spent in', () => {
    const monthly = month([
      expense(1000, Currency.INR, true, 'Rent'),
      expense(50, Currency.USD, true, 'Rent'),
      expense(300, Currency.INR, true, 'Groceries'),
    ]);

    expect(monthly.getCategoryTotal(converter, 'Rent')).toBe(1000 + 50 * USD_RATE);
    expect(monthly.getCategoryTotal(converter, 'Groceries')).toBe(300);
  });

  it('lists every category once', () => {
    const monthly = month([
      expense(100, Currency.INR, true, 'Rent'),
      expense(200, Currency.INR, true, 'Rent'),
      expense(300, Currency.INR, true, 'Groceries'),
    ]);

    expect(monthly.getAllCategories()).toEqual(['Rent', 'Groceries']);
  });

  it('counts an unrated currency as zero and reports it', () => {
    const monthly = month([expense(1000, Currency.INR), expense(40, Currency.GBP)]);

    expect(monthly.getTotalAmount(converter)).toBe(1000);
    expect(monthly.getUnratedCurrencies(converter)).toEqual([Currency.GBP]);
  });

  it('reports nothing unrated when every currency converts', () => {
    const monthly = month([expense(1000, Currency.INR), expense(40, Currency.USD)]);

    expect(monthly.getUnratedCurrencies(converter)).toEqual([]);
  });

  it('is zero for a month with no expenses', () => {
    const monthly = month([]);

    expect(monthly.getTotalAmount(converter)).toBe(0);
    expect(monthly.getUnratedCurrencies(converter)).toEqual([]);
  });
});
