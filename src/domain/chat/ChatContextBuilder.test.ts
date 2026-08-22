import { describe, expect, it } from 'vitest';
import { AssetCategory } from '../entities/assets/AssetCategory';
import { ValueModel } from '../entities/assets/ValueModel';
import { Currency } from '../entities/shared/Currency';
import { buildChatSnapshot } from './ChatContextBuilder';
import { asset, expense, fakeContext, goal, loan, months, sip } from './ChatFixtures';

describe('buildChatSnapshot', () => {
  it('describes an empty database without failing', async () => {
    const snapshot = await buildChatSnapshot(fakeContext());

    expect(snapshot.netWorth).toBe(0);
    expect(snapshot.assetCount).toBe(0);
    expect(snapshot.allocation).toEqual([]);
    expect(snapshot.goals).toEqual([]);
    expect(snapshot.recentSpending.byCurrency).toEqual([]);
    expect(snapshot.baseCurrency).toBe(Currency.INR);
  });

  it('reports net worth net of loans', async () => {
    const snapshot = await buildChatSnapshot(
      fakeContext({ assets: [asset({ manualValue: 300000 })], loans: [loan()] })
    );

    expect(snapshot.totalAssetValue).toBeGreaterThan(0);
    expect(snapshot.totalLoanOutstanding).toBeGreaterThan(0);
    expect(snapshot.netWorth).toBeLessThan(snapshot.totalAssetValue);
  });

  it('reports allocation shares by category', async () => {
    const snapshot = await buildChatSnapshot(
      fakeContext({
        assets: [
          asset({ id: 1, category: 'Stock', manualValue: 750 }),
          asset({ id: 2, category: 'Gold', manualValue: 250 }),
        ],
      })
    );

    // Largest share first. A market-based value is projected from when it was
    // last updated to the real clock, so the shares sit close to 75/25 rather
    // than exactly on it.
    expect(snapshot.allocation.map(entry => entry.category)).toEqual(['Stock', 'Gold']);
    expect(snapshot.allocation[0].percentage).toBeCloseTo(75, 0);
    expect(snapshot.allocation[1].percentage).toBeCloseTo(25, 0);
  });

  // The window is relative to the injected `today`, so an old expense must not
  // land in "recent spending".
  it('counts only the last three months of spending', async () => {
    const snapshot = await buildChatSnapshot(
      fakeContext({
        monthlyExpenses: months([
          expense({ id: 1, amount: 4000, date: new Date('2026-08-05') }),
          expense({ id: 2, amount: 9000, date: new Date('2024-01-05') }),
        ]),
      })
    );

    expect(snapshot.recentSpending.months).toBe(3);
    expect(snapshot.recentSpending.byCurrency).toHaveLength(1);
    expect(snapshot.recentSpending.byCurrency[0].total).toBe(4000);
  });

  it('reports the essential share of recent spending', async () => {
    const snapshot = await buildChatSnapshot(
      fakeContext({
        monthlyExpenses: months([
          expense({ id: 1, amount: 3000, isEssential: true }),
          expense({ id: 2, amount: 1000, isEssential: false, category: 'Dining Out' }),
        ]),
      })
    );

    expect(snapshot.recentSpending.byCurrency[0].essentialShare).toBe(75);
  });

  it('summarises each goal in one line', async () => {
    const snapshot = await buildChatSnapshot(
      fakeContext({ goals: [goal({ name: 'Retirement', targetAmount: 50_000_000 })] })
    );

    expect(snapshot.goalCount).toBe(1);
    expect(snapshot.goals[0].name).toBe('Retirement');
    expect(snapshot.goals[0].shortfall).toBeGreaterThan(0);
  });

  // Spending is reported once per currency and never converted, so a currency
  // spent in needs no rate and must not be reported as unrated — only holdings,
  // which do get converted into the base currency, can be.
  it('names unrated holding currencies, and leaves spending out of it', async () => {
    const snapshot = await buildChatSnapshot(
      fakeContext({
        assets: [asset({ currency: Currency.USD })],
        monthlyExpenses: months([
          expense({ currency: Currency.GBP, date: new Date('2026-08-05') }),
        ]),
      })
    );

    expect(snapshot.unratedCurrencies).toEqual([Currency.USD]);
  });

  it('reports each currency spent in separately, largest first', async () => {
    const snapshot = await buildChatSnapshot(
      fakeContext({
        monthlyExpenses: months([
          expense({ id: 1, amount: 4000, currency: Currency.INR, date: new Date('2026-08-05') }),
          expense({ id: 2, amount: 300, currency: Currency.GBP, date: new Date('2026-08-06') }),
        ]),
      })
    );

    expect(snapshot.recentSpending.byCurrency.map(spend => [spend.currency, spend.total])).toEqual([
      [Currency.INR, 4000],
      [Currency.GBP, 300],
    ]);
  });

  // A model asked what to invest reasons about spare cash without checking what
  // is already spoken for, so the figure travels on every turn.
  it('reports what is already committed next month', async () => {
    const snapshot = await buildChatSnapshot(
      fakeContext({
        assets: [asset({ id: 1 })],
        sipsByAsset: { 1: [sip({ price: 20000 })] },
        loans: [loan({ emiAmount: 45000 })],
      })
    );

    expect(snapshot.committedNextMonth).toEqual({ sip: 20000, emi: 45000, total: 65000 });
  });

  it('reports zero committed when nothing is scheduled', async () => {
    const snapshot = await buildChatSnapshot(fakeContext());

    expect(snapshot.committedNextMonth.total).toBe(0);
  });

  it('is dated, so the model can reason about "this month"', async () => {
    const snapshot = await buildChatSnapshot(fakeContext());

    expect(snapshot.asOf).toBe('2026-08-20');
  });
});

describe('the snapshot allocation drift', () => {
  function holding(category: string, value: number) {
    return asset({
      category,
      valueModel: ValueModel.FIXED_INCOME,
      interestRate: 0,
      invested: value,
    });
  }

  it('reports no policy when the user has set none', async () => {
    const snapshot = await buildChatSnapshot(
      fakeContext({ assets: [holding(AssetCategory.STOCK, 100000)] })
    );

    expect(snapshot.allocationDrift).toEqual({ isSet: false, outOfBand: [] });
  });

  it('carries only the categories outside their band, to stay small', async () => {
    const snapshot = await buildChatSnapshot(
      fakeContext({
        assets: [
          holding(AssetCategory.STOCK, 700000),
          holding(AssetCategory.DEBT, 250000),
          holding(AssetCategory.GOLD, 50000),
        ],
        targetAllocation: [
          // 20 points over: out of band.
          { category: AssetCategory.STOCK, targetPercent: 50, bandPercent: 5 },
          // 5 points under, exactly on the band: a hold, so omitted.
          { category: AssetCategory.DEBT, targetPercent: 30, bandPercent: 5 },
          { category: AssetCategory.GOLD, targetPercent: 20, bandPercent: 5 },
        ],
      })
    );

    expect(snapshot.allocationDrift.isSet).toBe(true);
    expect(snapshot.allocationDrift.outOfBand.map(row => row.category)).toEqual([
      AssetCategory.STOCK,
      AssetCategory.GOLD,
    ]);
    expect(snapshot.allocationDrift.outOfBand[0].action).toBe('sell');
    expect(snapshot.allocationDrift.outOfBand[1].action).toBe('buy');
  });

  it('reports a policy that is being met with nothing out of band', async () => {
    const snapshot = await buildChatSnapshot(
      fakeContext({
        assets: [holding(AssetCategory.STOCK, 600000), holding(AssetCategory.DEBT, 400000)],
        targetAllocation: [
          { category: AssetCategory.STOCK, targetPercent: 60 },
          { category: AssetCategory.DEBT, targetPercent: 40 },
        ],
      })
    );

    // Distinct from `isSet: false`: on target, versus no target at all.
    expect(snapshot.allocationDrift).toEqual({ isSet: true, outOfBand: [] });
  });
});
