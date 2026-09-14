import { describe, expect, it } from 'vitest';
import { Currency } from '../entities/shared/Currency';
import { asset, converter, expense, fakeContext, goal, loan, months, sip } from './ChatFixtures';
import { buildSandboxData } from './SandboxData';

/**
 * The snippet cannot reach the database, so this dataset is the whole of what it
 * can compute over. A missing or misnamed field is a snippet that fails at
 * runtime, which costs the user a turn.
 */
describe('buildSandboxData', () => {
  it('describes an empty database without throwing', async () => {
    const data = await buildSandboxData(fakeContext());

    expect(data.assets).toEqual([]);
    expect(data.loans).toEqual([]);
    expect(data.goals).toEqual([]);
    expect(data.monthlyExpenses).toEqual([]);
    expect(data.baseCurrency).toBe(Currency.INR);
  });

  it('carries each asset with the keys listAssets uses', async () => {
    const holding = asset({ invested: 400000 });

    const data = await buildSandboxData(fakeContext({ assets: [holding] }));
    const row = data.assets[0] as Record<string, number | string>;

    expect(row).toMatchObject({
      id: 1,
      name: 'Nifty Index Fund',
      category: 'Index Fund',
      currency: Currency.INR,
      invested: 400000,
    });
    // Read from the entity rather than restated, so the dataset cannot drift
    // from the figure the asset page shows.
    expect(row.currentValue).toBeCloseTo(holding.getValue()!, 2);
    expect(row.profitLoss).toBeCloseTo(holding.getProfitLoss()!, 2);
    expect(row.quantityHeld).toBeCloseTo(holding.getTotalQty(), 2);
  });

  // A snippet that has to know a rate is a snippet that will get one wrong.
  it('converts a foreign holding to the base currency alongside its own', async () => {
    const holding = asset({ currency: Currency.USD, invested: 1000 });

    const data = await buildSandboxData(
      fakeContext({ assets: [holding], converter: converter({ [Currency.USD]: 88 }) })
    );
    const row = data.assets[0] as Record<string, number | string>;

    expect(row.currency).toBe(Currency.USD);
    expect(row.invested).toBe(1000);
    expect(row.investedInBase).toBe(88000);
    expect(row.currentValueInBase).toBeCloseTo(holding.getValue()! * 88, 2);
  });

  it('names the currencies that counted as zero', async () => {
    const data = await buildSandboxData(
      fakeContext({
        assets: [asset({ currency: Currency.USD })],
        loans: [loan({ currency: Currency.GBP })],
      })
    );

    expect(data.unratedCurrencies).toEqual(expect.arrayContaining([Currency.USD, Currency.GBP]));
  });

  it('carries loans and goals with their computed positions', async () => {
    const data = await buildSandboxData(
      fakeContext({
        loans: [loan({ principalAmount: 1000000 })],
        goals: [goal({ targetAmount: 500000 })],
      })
    );

    expect(data.loans[0]).toMatchObject({ id: 1, name: 'Home Loan', principalAmount: 1000000 });
    expect(data.goals[0]).toMatchObject({ id: 1, name: 'Retirement', targetAmount: 500000 });
  });

  // A snippet solving for a loan's effective rate against a SIP needs the dated
  // schedule, not just the aggregate irrPercentage — this is the one place that
  // schedule leaves the entity.
  it("carries a loan's future EMIs as a dated cashflow", async () => {
    const data = await buildSandboxData(
      fakeContext({ loans: [loan({ emiAmount: 25000, emiEndDate: new Date('2027-01-01') })] })
    );
    const futureEmis = (data.loans[0] as { futureEmis: { date: string; amount: number }[] })
      .futureEmis;

    expect(futureEmis.length).toBeGreaterThan(0);
    expect(futureEmis[0]).toMatchObject({ date: '2026-08-25', amount: 25000 });
    // Sorted, and nothing before today.
    expect(futureEmis.every(row => row.date >= '2026-08-20')).toBe(true);
  });

  it("carries an asset's future SIP contributions, none of them in the past", async () => {
    const data = await buildSandboxData(
      fakeContext({ assets: [asset({ sips: [sip({ price: 5000 })] })] })
    );
    const futureContributions = (
      data.assets[0] as { futureContributions: { date: string; amount: number }[] }
    ).futureContributions;

    expect(futureContributions.length).toBeGreaterThan(0);
    expect(futureContributions[0]).toMatchObject({ date: '2026-08-25', amount: 5000 });
    expect(futureContributions.every(row => row.date > '2026-08-20')).toBe(true);
  });

  it('converts future cashflows to the base currency', async () => {
    const data = await buildSandboxData(
      fakeContext({
        loans: [loan({ currency: Currency.USD, emiAmount: 1000 })],
        converter: converter({ [Currency.USD]: 88 }),
      })
    );
    const futureEmis = (data.loans[0] as { futureEmis: { amount: number; amountInBase: number }[] })
      .futureEmis;

    expect(futureEmis[0].amountInBase).toBeCloseTo(futureEmis[0].amount * 88, 2);
  });

  it('summarises spending per month, essential split included', async () => {
    const data = await buildSandboxData(
      fakeContext({
        monthlyExpenses: months([
          expense({ id: 1, amount: 4000, isEssential: true }),
          expense({ id: 2, amount: 1500, isEssential: false, category: 'Entertainment' }),
        ]),
      })
    );

    expect(data.monthlyExpenses[0]).toMatchObject({
      month: '2026-08',
      byCurrency: [
        {
          currency: 'INR',
          total: 5500,
          essential: 4000,
          nonEssential: 1500,
        },
      ],
    });
  });

  // A snippet must not be handed a blended spending figure: nothing converts an
  // expense, so a month spent in two currencies arrives as two entries.
  it('keeps a month spent in two currencies as two entries', async () => {
    const data = await buildSandboxData(
      fakeContext({
        monthlyExpenses: months([
          expense({ id: 1, amount: 4000, currency: Currency.INR }),
          expense({ id: 2, amount: 300, currency: Currency.GBP }),
        ]),
      })
    );

    expect(data.monthlyExpenses[0]).toMatchObject({
      byCurrency: [
        { currency: Currency.INR, total: 4000 },
        { currency: Currency.GBP, total: 300 },
      ],
    });
  });

  it('reports nothing truncated for a small database', async () => {
    const data = await buildSandboxData(fakeContext({ assets: [asset()] }));

    expect(data.truncated).toEqual([]);
  });

  // A snippet summing a cut list would report a total that looks complete.
  it('names a list it had to cut', async () => {
    const many = Array.from({ length: 501 }, (_, index) => asset({ id: index + 1 }));

    const data = await buildSandboxData(fakeContext({ assets: many }));

    expect(data.assets).toHaveLength(500);
    expect(data.truncated).toContain('assets');
  });
});
