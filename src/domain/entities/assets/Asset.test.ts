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

/**
 * Both cases here produced an asset whose money counted as invested while its
 * value accounted for none of it — which is what drew the dashboard timeline's
 * invested line above its value line for years.
 */
describe('Asset valuation when money arrives after the model stops watching', () => {
  const utc = (y: number, m: number) => new Date(Date.UTC(y, m, 1));

  /** Deposits carry no quantity, as fixed-deposit-style records generally do. */
  function deposits(...at: [number, number, number][]): Investment[] {
    return at.map(
      ([y, m, amount], i) =>
        new Investment({
          id: i,
          assetId: 1,
          type: InvestmentType.BUY,
          quantity: undefined,
          totalAmount: amount,
          date: utc(y, m),
        })
    );
  }

  it('still holds money deposited after a fixed-income asset matured', () => {
    // Maturity stops the interest, not the money. Growth was capped at the
    // maturity date *and* the later deposit was dropped from the sum entirely,
    // so 100,000 put in after maturity valued at nothing for ever.
    const fd = new Asset({
      ...BASE,
      valueModel: ValueModel.FIXED_INCOME,
      interestRate: 7,
      maturityDate: utc(2020, 5),
      investments: deposits([2019, 0, 100000], [2020, 8, 100000]),
      sips: [],
    });

    const beforeTheLateDeposit = fd.getValueOn(utc(2020, 7))!;

    // The late deposit adds its face value: it earns nothing further, and what
    // it might earn elsewhere is not something this asset records.
    expect(fd.getValueOn(utc(2021, 0))).toBeCloseTo(beforeTheLateDeposit + 100000, 6);
    expect(fd.getValueOn(utc(2021, 0))).toBeGreaterThan(fd.getTotalInvestedAmount(utc(2021, 0)));
  });

  it('fits the market IRR only against the money the recorded value measured', () => {
    // A value noted in mid-2020 cannot account for deposits made in 2022 and
    // 2024. Fitting them against it asked for the rate at which 200,000 grows
    // into 250,000 *and* 500,000 into 250,000; the solver answered -100%, which
    // valued the whole asset at zero on every date.
    const staleValue = new Asset({
      ...BASE,
      manualValue: 250000,
      manualValueUpdatedAt: utc(2020, 5),
      investments: deposits([2019, 0, 100000], [2020, 0, 100000], [2022, 0, 100000]),
      sips: [],
    });

    expect(staleValue.getIRR()).toBeGreaterThan(0);
    expect(staleValue.getValue()).toBeGreaterThan(0);
    // The fit is self-consistent: valued on its own valuation date, the asset is
    // worth what was recorded there, to the solver's 0.01% convergence tolerance.
    expect(staleValue.getValueOn(utc(2020, 5))! / 250000).toBeCloseTo(1, 3);
  });

  it('leaves an asset whose value is current exactly as it was', () => {
    // The guard on the fix above: it must change nothing for the ordinary case
    // where every deposit predates the recorded value.
    const current = new Asset({
      ...BASE,
      manualValue: 600000,
      manualValueUpdatedAt: utc(2026, 8),
      investments: deposits([2019, 0, 100000], [2020, 0, 100000], [2022, 0, 100000]),
      sips: [],
    });

    expect(current.getIRR()).toBeCloseTo(11.4, 1);
    expect(current.getValueOn(utc(2021, 0))).toBeCloseTo(235570, 0);
  });
});
