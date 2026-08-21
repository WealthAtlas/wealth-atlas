import { describe, expect, it } from 'vitest';
import { Asset, IAsset } from '../entities/assets/Asset';
import { Investment, InvestmentType } from '../entities/assets/Investment';
import { ValueModel } from '../entities/assets/ValueModel';
import { IEMI } from '../entities/loans/EMI';
import { ILoan, Loan } from '../entities/loans/Loan';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { Frequency } from '../entities/shared/Frequency';
import {
  computeAssetCategoryData,
  computeDashboardMetrics,
  computeMonthlyInvestmentData,
} from './DashboardService';

const USD_RATE = 88;
const GBP_RATE = 112;

function converter(rates: Partial<Record<Currency, number>>): CurrencyConverter {
  return new CurrencyConverter(
    Currency.INR,
    new Map(Object.entries(rates) as [Currency, number][])
  );
}

const ASSET: IAsset = {
  id: 1,
  name: 'Test Asset',
  description: '',
  category: 'Stock',
  currency: Currency.INR,
  valueModel: ValueModel.MARKET_BASED,
  interestRate: undefined,
  maturityDate: undefined,
  maturityAmount: undefined,
  manualValue: 1500,
  manualValueUpdatedAt: new Date('2026-08-01'),
  script: undefined,
  scriptValue: undefined,
  scriptValueUpdatedAt: undefined,
};

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function asset(overrides: Partial<IAsset> & { investedAmount?: number } = {}): Asset {
  const { investedAmount = 1000, ...assetOverrides } = overrides;
  return new Asset({
    ...ASSET,
    ...assetOverrides,
    investments: [
      new Investment({
        id: undefined,
        assetId: 1,
        type: InvestmentType.BUY,
        quantity: 10,
        totalAmount: investedAmount,
        date: daysAgo(90),
      }),
    ],
    sips: [],
  });
}

/**
 * A loan whose outstanding amount is stable over time: the schedule starts and
 * ends in the past, so the pending occurrences it projects never change.
 */
function loan(currency: Currency, emiAmount: number): Loan {
  const base: ILoan = {
    id: 1,
    name: 'Test Loan',
    description: '',
    principalAmount: 100000,
    currency,
    startDate: new Date('2020-01-01'),
  };
  const emi: IEMI = {
    id: 1,
    loanId: 1,
    name: 'EMI',
    amount: emiAmount,
    frequency: Frequency.MONTHLY,
    startDate: new Date('2020-01-01'),
    endDate: new Date('2020-04-01'),
    lastGeneratedDate: undefined,
  };
  return new Loan({ ...base, payments: [], emis: [emi] });
}

describe('computeDashboardMetrics', () => {
  it('reports every total in the base currency', () => {
    const inr = asset({ currency: Currency.INR });
    const usd = asset({ currency: Currency.USD });
    const rates = converter({ [Currency.USD]: USD_RATE });

    const metrics = computeDashboardMetrics([inr, usd], [], rates);

    expect(metrics.currency).toBe(Currency.INR);
    expect(metrics.totalAssetValue).toBeCloseTo(inr.getValue()! + usd.getValue()! * USD_RATE, 1);
    expect(metrics.totalInvestedAmount).toBeCloseTo(
      inr.getTotalInvestedAmount() + usd.getTotalInvestedAmount() * USD_RATE,
      1
    );
  });

  it('converts a loan before subtracting it from wealth', () => {
    const usdLoan = loan(Currency.USD, 500);
    const rates = converter({ [Currency.USD]: USD_RATE });

    const metrics = computeDashboardMetrics([], [usdLoan], rates);

    expect(metrics.totalLoanAmount).toBeCloseTo(usdLoan.getOutstandingAmount() * USD_RATE, 1);
    expect(metrics.totalWealth).toBeCloseTo(-metrics.totalLoanAmount, 1);
  });

  it('leaves profit percentage untouched by the conversion', () => {
    // Both sides of a holding convert at one rate, so the ratio is preserved:
    // the same portfolio in USD reports the same percentage as in INR.
    const inrOnly = computeDashboardMetrics(
      [asset({ currency: Currency.INR, investedAmount: 1000 })],
      [],
      converter({})
    );
    const usdOnly = computeDashboardMetrics(
      [asset({ currency: Currency.USD, investedAmount: 1000 })],
      [],
      converter({ [Currency.USD]: USD_RATE })
    );

    expect(usdOnly.profitLossPercentage).toBeCloseTo(inrOnly.profitLossPercentage, 6);
  });

  it('counts an unrated holding as zero and names the currency', () => {
    const inr = asset({ currency: Currency.INR });
    const gbp = asset({ currency: Currency.GBP });
    const rates = converter({ [Currency.USD]: USD_RATE });

    const metrics = computeDashboardMetrics([inr, gbp], [], rates);

    expect(metrics.totalAssetValue).toBeCloseTo(inr.getValue()!, 1);
    expect(metrics.unratedCurrencies).toEqual([Currency.GBP]);
  });

  it('names an unrated loan currency too, since a zeroed loan inflates wealth', () => {
    const metrics = computeDashboardMetrics([], [loan(Currency.GBP, 500)], converter({}));

    expect(metrics.totalLoanAmount).toBe(0);
    expect(metrics.totalWealth).toBe(0);
    expect(metrics.unratedCurrencies).toEqual([Currency.GBP]);
  });

  it('reports no unrated currencies when every holding can be converted', () => {
    const metrics = computeDashboardMetrics(
      [asset({ currency: Currency.USD }), asset({ currency: Currency.GBP })],
      [loan(Currency.INR, 500)],
      converter({ [Currency.USD]: USD_RATE, [Currency.GBP]: GBP_RATE })
    );

    expect(metrics.unratedCurrencies).toEqual([]);
  });
});

describe('computeAssetCategoryData', () => {
  it('weighs categories by their converted value', () => {
    const rates = converter({ [Currency.USD]: USD_RATE });
    const inr = asset({ currency: Currency.INR, category: 'Stock' });
    const usd = asset({ currency: Currency.USD, category: 'Fund' });

    const [first, second] = computeAssetCategoryData([inr, usd], rates);

    // The USD holding is the same size in its own currency but ~88x once
    // converted, so it must lead the allocation.
    expect(first.label).toBe('Fund');
    expect(second.label).toBe('Stock');
    expect(first.percentage + second.percentage).toBeCloseTo(100, 6);
  });

  it('drops a category whose only asset has no rate', () => {
    const categories = computeAssetCategoryData(
      [asset({ currency: Currency.GBP, category: 'Fund' })],
      converter({})
    );

    expect(categories).toEqual([]);
  });
});

describe('computeMonthlyInvestmentData', () => {
  it('converts each investment through its own asset currency', () => {
    const date = daysAgo(20);
    const inr = new Asset({
      ...ASSET,
      currency: Currency.INR,
      investments: [
        new Investment({
          id: undefined,
          assetId: 1,
          type: InvestmentType.BUY,
          quantity: 1,
          totalAmount: 1000,
          date,
        }),
      ],
      sips: [],
    });
    const usd = new Asset({
      ...ASSET,
      currency: Currency.USD,
      investments: [
        new Investment({
          id: undefined,
          assetId: 2,
          type: InvestmentType.BUY,
          quantity: 1,
          totalAmount: 100,
          date,
        }),
      ],
      sips: [],
    });

    const monthly = computeMonthlyInvestmentData(
      [inr, usd],
      converter({ [Currency.USD]: USD_RATE })
    );

    expect(monthly).toHaveLength(1);
    expect(monthly[0].amount).toBeCloseTo(1000 + 100 * USD_RATE, 1);
  });
});
