import { describe, expect, it } from 'vitest';
import { Currency } from './Currency';
import { CurrencyConverter } from './CurrencyConverter';

function converter(
  base: Currency = Currency.INR,
  rates: Partial<Record<Currency, number>> = { [Currency.USD]: 88, [Currency.GBP]: 112 }
): CurrencyConverter {
  return new CurrencyConverter(base, new Map(Object.entries(rates) as [Currency, number][]));
}

describe('CurrencyConverter', () => {
  it('leaves an amount already in the target currency untouched', () => {
    expect(converter().convert(1234.56, Currency.INR, Currency.INR)).toBe(1234.56);
    expect(converter().convert(1234.56, Currency.USD, Currency.USD)).toBe(1234.56);
  });

  it('converts into the base currency at the stored rate', () => {
    expect(converter().toBase(1000, Currency.USD)).toBe(88000);
  });

  it('converts between two non-base currencies through the base', () => {
    // 1000 GBP = 112,000 INR = 1272.73 USD
    expect(converter().convert(1000, Currency.GBP, Currency.USD)).toBe(1272.73);
  });

  it('treats the base currency as rate 1 without needing a stored row', () => {
    expect(converter().hasRate(Currency.INR)).toBe(true);
    expect(converter().convert(500, Currency.INR, Currency.USD)).toBe(5.68);
  });

  it('yields 0 rather than guessing when a rate is missing', () => {
    const noUsdRate = converter(Currency.INR, { [Currency.GBP]: 112 });

    expect(noUsdRate.toBase(1000, Currency.USD)).toBe(0);
    expect(noUsdRate.hasRate(Currency.USD)).toBe(false);
  });

  it('rejects a stored rate that is zero or negative', () => {
    const broken = converter(Currency.INR, { [Currency.USD]: 0, [Currency.GBP]: -5 });

    expect(broken.hasRate(Currency.USD)).toBe(false);
    expect(broken.hasRate(Currency.GBP)).toBe(false);
    expect(broken.toBase(1000, Currency.USD)).toBe(0);
  });

  it('reports which of the given currencies cannot be converted', () => {
    const onlyGbp = converter(Currency.INR, { [Currency.GBP]: 112 });

    expect(onlyGbp.getUnratedCurrencies([Currency.INR, Currency.GBP, Currency.USD])).toEqual([
      Currency.USD,
    ]);
  });

  it('deduplicates repeated unrated currencies', () => {
    const noRates = converter(Currency.INR, {});

    expect(noRates.getUnratedCurrencies([Currency.USD, Currency.USD, Currency.GBP])).toEqual([
      Currency.USD,
      Currency.GBP,
    ]);
  });

  it('preserves ratios, so a converted profit percentage is unchanged', () => {
    const invested = converter().toBase(10000, Currency.USD);
    const value = converter().toBase(12500, Currency.USD);

    expect((value - invested) / invested).toBeCloseTo(0.25, 10);
  });

  it('rounds to 2 decimals so totals read as money', () => {
    expect(converter(Currency.INR, { [Currency.USD]: 88.4237 }).toBase(3, Currency.USD)).toBe(
      265.27
    );
  });

  it('shrugs off a non-finite amount', () => {
    expect(converter().toBase(Number.NaN, Currency.USD)).toBe(0);
    expect(converter().toBase(Number.POSITIVE_INFINITY, Currency.USD)).toBe(0);
  });
});
