import { describe, expect, it } from 'vitest';
import { asset, converter, USD_RATE } from '../chat/ChatFixtures';
import { AssetCategory } from '../entities/assets/AssetCategory';
import { ValueModel } from '../entities/assets/ValueModel';
import { Currency } from '../entities/shared/Currency';
import { computeAllocationDrift } from './AllocationDrift';

/**
 * A holding worth exactly `value`, whatever day the suite runs on.
 *
 * The fixture's default MARKET_BASED model solves an IRR and projects it to
 * `new Date()`, so its value drifts with the clock. FIXED_INCOME at 0% just
 * carries the invested amount forward unchanged, which is what a drift test
 * needs: the arithmetic under test is the share of the total, not the
 * valuation.
 */
let nextId = 1;
function holding(category: string, value: number, currency: Currency = Currency.INR) {
  return asset({
    id: nextId++,
    category,
    currency,
    valueModel: ValueModel.FIXED_INCOME,
    interestRate: 0,
    invested: value,
  });
}

describe('computeAllocationDrift', () => {
  it('calls an underweight category a buy and an overweight one a sell', () => {
    const drift = computeAllocationDrift(
      [holding(AssetCategory.STOCK, 700000), holding(AssetCategory.DEBT, 300000)],
      [
        { category: AssetCategory.STOCK, targetPercent: 60 },
        { category: AssetCategory.DEBT, targetPercent: 40 },
      ],
      converter()
    );

    const stock = drift.rows.find(row => row.category === AssetCategory.STOCK);
    const debt = drift.rows.find(row => row.category === AssetCategory.DEBT);

    expect(stock?.actualPercent).toBe(70);
    expect(stock?.driftPercent).toBe(10);
    expect(stock?.action).toBe('sell');
    expect(stock?.adjustmentAmount).toBe(-100000);

    expect(debt?.driftPercent).toBe(-10);
    expect(debt?.action).toBe('buy');
    expect(debt?.adjustmentAmount).toBe(100000);
  });

  it('holds while the drift is inside the band', () => {
    const drift = computeAllocationDrift(
      [holding(AssetCategory.STOCK, 630000), holding(AssetCategory.DEBT, 370000)],
      [
        { category: AssetCategory.STOCK, targetPercent: 60, bandPercent: 5 },
        { category: AssetCategory.DEBT, targetPercent: 40, bandPercent: 5 },
      ],
      converter()
    );

    expect(drift.rows.every(row => row.action === 'hold')).toBe(true);
    // Still reported, so the user sees a small drift rather than nothing.
    expect(drift.rows.find(row => row.category === AssetCategory.STOCK)?.driftPercent).toBe(3);
  });

  it('reports a targeted category that is held not at all', () => {
    const drift = computeAllocationDrift(
      [holding(AssetCategory.STOCK, 1000000)],
      [
        { category: AssetCategory.STOCK, targetPercent: 80 },
        { category: AssetCategory.GOLD, targetPercent: 20 },
      ],
      converter()
    );

    const gold = drift.rows.find(row => row.category === AssetCategory.GOLD);

    expect(gold).toBeDefined();
    expect(gold?.currentValue).toBe(0);
    expect(gold?.action).toBe('buy');
    expect(gold?.adjustmentAmount).toBe(200000);
  });

  it('lists held categories the policy never mentions instead of ignoring them', () => {
    const drift = computeAllocationDrift(
      [holding(AssetCategory.STOCK, 800000), holding(AssetCategory.CRYPTOCURRENCY, 200000)],
      [{ category: AssetCategory.STOCK, targetPercent: 100 }],
      converter()
    );

    expect(drift.untargeted).toEqual([
      { category: AssetCategory.CRYPTOCURRENCY, actualPercent: 20, currentValue: 200000 },
    ]);
  });

  it('orders the largest absolute drift first', () => {
    const drift = computeAllocationDrift(
      [holding(AssetCategory.STOCK, 900000), holding(AssetCategory.DEBT, 100000)],
      [
        { category: AssetCategory.DEBT, targetPercent: 20 },
        { category: AssetCategory.STOCK, targetPercent: 50 },
      ],
      converter()
    );

    expect(drift.rows[0].category).toBe(AssetCategory.STOCK);
  });

  it('converts foreign holdings and passes on the currencies it could not rate', () => {
    const drift = computeAllocationDrift(
      [holding(AssetCategory.STOCK, 1000, Currency.USD), holding(AssetCategory.GOLD, 88000)],
      [
        { category: AssetCategory.STOCK, targetPercent: 50 },
        { category: AssetCategory.GOLD, targetPercent: 50 },
      ],
      converter({ USD: USD_RATE })
    );

    expect(drift.totalValue).toBe(176000);
    expect(drift.rows.every(row => row.action === 'hold')).toBe(true);
    expect(drift.unratedCurrencies).toEqual([]);
  });

  it('reports an unrated currency, whose holdings counted as zero', () => {
    const drift = computeAllocationDrift(
      [holding(AssetCategory.STOCK, 1000, Currency.GBP), holding(AssetCategory.GOLD, 50000)],
      [
        { category: AssetCategory.STOCK, targetPercent: 50 },
        { category: AssetCategory.GOLD, targetPercent: 50 },
      ],
      converter()
    );

    expect(drift.unratedCurrencies).toContain(Currency.GBP);
    // The GBP holding vanished from the total, so equity looks absent.
    expect(drift.rows.find(row => row.category === AssetCategory.STOCK)?.currentValue).toBe(0);
  });

  it('reports zero shares rather than dividing by an empty portfolio', () => {
    const drift = computeAllocationDrift(
      [],
      [{ category: AssetCategory.STOCK, targetPercent: 60 }],
      converter()
    );

    expect(drift.totalValue).toBe(0);
    expect(drift.rows[0].actualPercent).toBe(0);
    expect(drift.rows[0].adjustmentAmount).toBe(0);
  });
});
