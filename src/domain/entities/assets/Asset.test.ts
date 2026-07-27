import { describe, expect, it } from 'vitest';
import { Currency } from '../shared/Currency';
import { Asset, IAsset } from './Asset';
import { Investment, InvestmentType } from './Investment';
import { ValueModel } from './ValueModel';

const BASE: IAsset = {
  id: 1,
  name: 'Test Asset',
  description: '',
  category: 'Stock',
  currency: Currency.INR,
  valueModel: ValueModel.MARKET_BASED,
  interestRate: undefined,
  maturityDate: undefined,
  maturityAmount: undefined,
  manualValue: undefined,
  manualValueUpdatedAt: undefined,
  script: undefined,
  scriptValue: undefined,
  scriptValueUpdatedAt: undefined,
};

function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

function tx(
  type: InvestmentType,
  quantity: number,
  totalAmount: number,
  date: Date = daysAgo(30)
): Investment {
  return new Investment({ id: undefined, assetId: 1, type, quantity, totalAmount, date });
}

function assetWith(investments: Investment[]): Asset {
  return new Asset({ ...BASE, investments, sips: [] });
}

describe('Asset buy/sell aggregation', () => {
  it('adds buys and subtracts sells from the invested amount', () => {
    const asset = assetWith([
      tx(InvestmentType.BUY, 10, 1000, daysAgo(60)),
      tx(InvestmentType.BUY, 5, 600, daysAgo(45)),
      tx(InvestmentType.SELL, 4, 500, daysAgo(30)),
    ]);

    expect(asset.getTotalInvestedAmount()).toBe(1100);
  });

  it('adds buys and subtracts sells from the total quantity', () => {
    const asset = assetWith([
      tx(InvestmentType.BUY, 10, 1000, daysAgo(60)),
      tx(InvestmentType.SELL, 4, 500, daysAgo(30)),
    ]);

    expect(asset.getTotalQty()).toBe(6);
  });

  it('reflects sells in current holdings', () => {
    const asset = assetWith([
      tx(InvestmentType.BUY, 100, 10_000, daysAgo(60)),
      tx(InvestmentType.SELL, 40, 5_000, daysAgo(10)),
    ]);

    expect(asset.getCurrentHoldings()).toBe(60);
  });

  it('reports no holdings once everything is sold', () => {
    const asset = assetWith([
      tx(InvestmentType.BUY, 10, 1000, daysAgo(60)),
      tx(InvestmentType.SELL, 10, 1200, daysAgo(5)),
    ]);

    expect(asset.getCurrentHoldings()).toBeUndefined();
  });

  it('excludes transactions after the "till" date', () => {
    const asset = assetWith([
      tx(InvestmentType.BUY, 10, 1000, daysAgo(60)),
      tx(InvestmentType.SELL, 4, 500, daysAgo(5)),
    ]);

    expect(asset.getTotalInvestedAmount(daysAgo(30))).toBe(1000);
    expect(asset.getTotalQty(daysAgo(30))).toBe(10);
  });

  it('treats a fully bought-and-sold position as zero net investment', () => {
    const asset = assetWith([
      tx(InvestmentType.BUY, 10, 1000, daysAgo(60)),
      tx(InvestmentType.SELL, 10, 1000, daysAgo(5)),
    ]);

    expect(asset.getTotalInvestedAmount()).toBe(0);
    expect(asset.getTotalQty()).toBe(0);
  });
});

describe('Investment', () => {
  it('stores amounts positive and applies direction via type', () => {
    const buy = tx(InvestmentType.BUY, 10, 1000);
    const sell = tx(InvestmentType.SELL, 10, 1000);

    expect(buy.totalAmount).toBe(1000);
    expect(sell.totalAmount).toBe(1000);
    expect(buy.getSignedAmount()).toBe(1000);
    expect(sell.getSignedAmount()).toBe(-1000);
    expect(buy.getSignedQuantity()).toBe(10);
    expect(sell.getSignedQuantity()).toBe(-10);
  });

  it('derives unit price from the total', () => {
    expect(tx(InvestmentType.BUY, 4, 1000).getUnitPrice()).toBe(250);
  });

  it('falls back to the total when there is no quantity', () => {
    const noQty = new Investment({
      id: undefined,
      assetId: 1,
      type: InvestmentType.BUY,
      quantity: undefined,
      totalAmount: 750,
      date: daysAgo(1),
    });

    expect(noQty.getUnitPrice()).toBe(750);
    expect(noQty.getSignedQuantity()).toBe(0);
  });
});
