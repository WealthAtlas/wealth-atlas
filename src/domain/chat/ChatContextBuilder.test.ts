import { describe, expect, it } from 'vitest';
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
    expect(snapshot.recentSpending.total).toBe(0);
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
    expect(snapshot.recentSpending.total).toBe(4000);
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

    expect(snapshot.recentSpending.essentialShare).toBe(75);
  });

  it('summarises each goal in one line', async () => {
    const snapshot = await buildChatSnapshot(
      fakeContext({ goals: [goal({ name: 'Retirement', targetAmount: 50_000_000 })] })
    );

    expect(snapshot.goalCount).toBe(1);
    expect(snapshot.goals[0].name).toBe('Retirement');
    expect(snapshot.goals[0].shortfall).toBeGreaterThan(0);
  });

  it('collects unrated currencies from both holdings and spending', async () => {
    const snapshot = await buildChatSnapshot(
      fakeContext({
        assets: [asset({ currency: Currency.USD })],
        monthlyExpenses: months([
          expense({ currency: Currency.GBP, date: new Date('2026-08-05') }),
        ]),
      })
    );

    expect(snapshot.unratedCurrencies.sort()).toEqual([Currency.GBP, Currency.USD]);
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
