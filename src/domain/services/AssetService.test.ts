import { describe, expect, it } from 'vitest';
import { Asset, IAsset } from '../entities/assets/Asset';
import { Investment, InvestmentType } from '../entities/assets/Investment';
import { ValueModel } from '../entities/assets/ValueModel';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { computeAssetPortfolioTotals } from './AssetService';

const USD_RATE = 88;

function converter(rates: Partial<Record<Currency, number>> = {}): CurrencyConverter {
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
  manualValueUpdatedAt: new Date(),
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

describe('computeAssetPortfolioTotals', () => {
  it('returns zeroed totals for no assets', () => {
    const totals = computeAssetPortfolioTotals([], converter());

    expect(totals.totalValue).toBe(0);
    expect(totals.totalInvested).toBe(0);
    expect(totals.totalProfitLoss).toBe(0);
    expect(totals.totalProfitLossPercentage).toBe(0);
    expect(totals.unratedCurrencies).toEqual([]);
  });

  it('sums invested and current value, and derives the gain', () => {
    const totals = computeAssetPortfolioTotals(
      [asset({ investedAmount: 1000, manualValue: 1500 })],
      converter()
    );

    expect(totals.totalInvested).toBe(1000);
    expect(totals.totalValue).toBe(1500);
    expect(totals.totalProfitLoss).toBe(500);
    expect(totals.totalProfitLossPercentage).toBe(50);
    expect(totals.currency).toBe(Currency.INR);
  });

  it('reports a loss as a negative gain', () => {
    const totals = computeAssetPortfolioTotals(
      [asset({ investedAmount: 1000, manualValue: 800 })],
      converter()
    );

    expect(totals.totalProfitLoss).toBe(-200);
    expect(totals.totalProfitLossPercentage).toBe(-20);
  });

  it('leaves the percentage at zero when nothing has been invested', () => {
    const totals = computeAssetPortfolioTotals(
      [asset({ investedAmount: 0, manualValue: 0 })],
      converter()
    );

    expect(totals.totalProfitLossPercentage).toBe(0);
  });

  it('converts each asset from its own currency before summing', () => {
    const totals = computeAssetPortfolioTotals(
      [
        asset({ investedAmount: 1000, manualValue: 1000 }),
        asset({ currency: Currency.USD, investedAmount: 10, manualValue: 10 }),
      ],
      converter({ [Currency.USD]: USD_RATE })
    );

    expect(totals.totalInvested).toBe(1000 + 10 * USD_RATE);
    expect(totals.unratedCurrencies).toEqual([]);
  });

  // A holding that converts to 0 understates the portfolio, which reads as a
  // real total rather than as a missing rate.
  it('names currencies with no rate, whose holdings counted as zero', () => {
    const totals = computeAssetPortfolioTotals(
      [
        asset({ investedAmount: 1000, manualValue: 1000 }),
        asset({ currency: Currency.USD, investedAmount: 10, manualValue: 10 }),
      ],
      converter()
    );

    expect(totals.totalInvested).toBe(1000);
    expect(totals.unratedCurrencies).toEqual([Currency.USD]);
  });
});
