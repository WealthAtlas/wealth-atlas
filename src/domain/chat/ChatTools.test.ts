import { describe, expect, it } from 'vitest';
import { Currency } from '../entities/shared/Currency';
import {
  asset,
  converter,
  expense,
  fakeContext,
  goal,
  loan,
  months,
  rate,
  sip,
  TODAY,
  USD_RATE,
} from './ChatFixtures';
import { CHAT_TOOL_NAMES, CHAT_TOOLS, CHAT_TOOLS_BY_NAME } from './ChatTools';

function tool(name: string) {
  const found = CHAT_TOOLS_BY_NAME.get(name);
  if (!found) throw new Error(`No such tool: ${name}`);
  return found;
}

describe('the tool registry', () => {
  it('has a unique name and a description for every tool', () => {
    expect(CHAT_TOOL_NAMES.size).toBe(CHAT_TOOLS.length);
    for (const entry of CHAT_TOOLS) {
      expect(entry.description.length).toBeGreaterThan(10);
    }
  });

  it('runs every tool without arguments against an empty database', async () => {
    // The model can call any tool at any time, including before the user has
    // entered anything, so none may throw on empty data or missing args.
    const ctx = fakeContext();
    for (const entry of CHAT_TOOLS) {
      await expect(entry.run({}, ctx)).resolves.toBeDefined();
    }
  });
});

describe('getPortfolioSummary', () => {
  it('reports net worth after subtracting loans', async () => {
    const result = (await tool('getPortfolioSummary').run(
      {},
      fakeContext({ assets: [asset({ manualValue: 150000 })], loans: [loan()] })
    )) as { totalWealth: number; totalAssetValue: number; totalLoanAmount: number };

    expect(result.totalAssetValue).toBeGreaterThan(0);
    expect(result.totalLoanAmount).toBeGreaterThan(0);
    expect(result.totalWealth).toBe(result.totalAssetValue - result.totalLoanAmount);
  });

  it('names a currency with no rate rather than reporting a short total', async () => {
    const result = (await tool('getPortfolioSummary').run(
      {},
      fakeContext({ assets: [asset({ currency: Currency.USD })] })
    )) as { unratedCurrencies: string[] };

    expect(result.unratedCurrencies).toEqual([Currency.USD]);
  });
});

describe('getAssetAllocation', () => {
  it('reports each category share, largest first', async () => {
    const result = (await tool('getAssetAllocation').run(
      {},
      fakeContext({
        assets: [
          asset({ id: 1, category: 'Stock', manualValue: 750 }),
          asset({ id: 2, category: 'Gold', manualValue: 250 }),
        ],
      })
    )) as { categories: { category: string; percentage: number }[] };

    expect(result.categories[0].percentage).toBeGreaterThan(result.categories[1].percentage);
    expect(result.categories.map(entry => entry.category)).toEqual(['Stock', 'Gold']);
  });
});

describe('listAssets', () => {
  it('reports each asset in its own currency and in the base currency', async () => {
    const result = (await tool('listAssets').run(
      {},
      fakeContext({
        assets: [asset({ currency: Currency.USD, invested: 100, manualValue: 120 })],
        converter: converter({ [Currency.USD]: USD_RATE }),
      })
    )) as { items: { invested: number; investedInBase: number; currency: string }[] };

    expect(result.items[0].currency).toBe(Currency.USD);
    expect(result.items[0].invested).toBe(100);
    expect(result.items[0].investedInBase).toBe(100 * USD_RATE);
  });

  it('filters by category, case-insensitively', async () => {
    const ctx = fakeContext({
      assets: [asset({ id: 1, category: 'Gold' }), asset({ id: 2, category: 'Stock' })],
    });

    const result = (await tool('listAssets').run({ category: 'gold' }, ctx)) as {
      items: { category: string }[];
      totalCount: number;
    };

    expect(result.totalCount).toBe(1);
    expect(result.items[0].category).toBe('Gold');
  });

  it('flags a truncated list so the model knows it is partial', async () => {
    const many = Array.from({ length: 80 }, (_unused, index) => asset({ id: index + 1 }));

    const result = (await tool('listAssets').run({}, fakeContext({ assets: many }))) as {
      totalCount: number;
      truncated: boolean;
      items: unknown[];
    };

    expect(result.totalCount).toBe(80);
    expect(result.truncated).toBe(true);
    expect(result.items.length).toBeLessThan(80);
  });
});

describe('getAssetDetail', () => {
  it('refuses without an assetId rather than picking one', async () => {
    const result = (await tool('getAssetDetail').run({}, fakeContext())) as { error?: string };

    expect(result.error).toContain('assetId is required');
  });

  it('reports a missing asset instead of returning empty detail', async () => {
    const result = (await tool('getAssetDetail').run(
      { assetId: 99 },
      fakeContext({ assets: [asset({ id: 1 })] })
    )) as { error?: string };

    expect(result.error).toContain('99');
  });

  it('accepts an assetId the model sent as a string', async () => {
    const result = (await tool('getAssetDetail').run(
      { assetId: '1' },
      fakeContext({ assets: [asset({ id: 1 })] })
    )) as { id?: number };

    expect(result.id).toBe(1);
  });

  it('includes transactions and only SIPs that are still running', async () => {
    const result = (await tool('getAssetDetail').run(
      { assetId: 1 },
      fakeContext({
        assets: [asset({ id: 1 })],
        sipsByAsset: {
          1: [sip({ id: 1 }), sip({ id: 2, endDate: new Date('2025-01-01') })],
        },
      })
    )) as { transactions: { totalCount: number }; activeSIPs: unknown[] };

    expect(result.transactions.totalCount).toBe(1);
    expect(result.activeSIPs).toHaveLength(1);
  });
});

describe('getExpenseBreakdown', () => {
  it('accepts a months argument as a relative window', async () => {
    const result = (await tool('getExpenseBreakdown').run(
      { months: 1 },
      fakeContext({
        monthlyExpenses: months([
          expense({ amount: 4000, date: new Date('2026-08-05') }),
          expense({ amount: 9000, date: new Date('2024-01-05') }),
        ]),
      })
    )) as { total: number };

    // Only the recent expense falls inside a one-month window from TODAY.
    expect(result.total).toBe(4000);
  });

  it('honours explicit from and to dates', async () => {
    const result = (await tool('getExpenseBreakdown').run(
      { from: '2026-08-01', to: '2026-08-10' },
      fakeContext({
        monthlyExpenses: months([
          expense({ amount: 4000, date: new Date('2026-08-05') }),
          expense({ amount: 7000, date: new Date('2026-08-20') }),
        ]),
      })
    )) as { total: number; from: string };

    expect(result.total).toBe(4000);
    expect(result.from).toBe('2026-08-01');
  });

  it('ignores a malformed date rather than failing the question', async () => {
    const result = (await tool('getExpenseBreakdown').run(
      { from: 'last March' },
      fakeContext({ monthlyExpenses: months([expense({ amount: 4000 })]) })
    )) as { total: number; from: string };

    expect(result.total).toBe(4000);
    expect(result.from).toContain('earliest');
  });
});

describe('listExpenses', () => {
  it('returns rows newest first', async () => {
    const result = (await tool('listExpenses').run(
      {},
      fakeContext({
        monthlyExpenses: months([
          expense({ id: 1, amount: 100, date: new Date('2026-08-01') }),
          expense({ id: 2, amount: 200, date: new Date('2026-08-15') }),
        ]),
      })
    )) as { items: { date: string }[] };

    expect(result.items.map(item => item.date)).toEqual(['2026-08-15', '2026-08-01']);
  });

  it('filters by category', async () => {
    const result = (await tool('listExpenses').run(
      { category: 'Travel' },
      fakeContext({
        monthlyExpenses: months([
          expense({ id: 1, category: 'Groceries' }),
          expense({ id: 2, category: 'Travel' }),
        ]),
      })
    )) as { totalCount: number };

    expect(result.totalCount).toBe(1);
  });
});

describe('getLoanSummary', () => {
  it('reports outstanding, next payment and payments remaining per loan', async () => {
    const result = (await tool('getLoanSummary').run({}, fakeContext({ loans: [loan()] }))) as {
      loans: {
        outstanding: number;
        nextPaymentDate?: string;
        paymentsRemaining: number;
      }[];
    };

    expect(result.loans[0].outstanding).toBeGreaterThan(0);
    expect(result.loans[0].nextPaymentDate).toBeDefined();
    expect(result.loans[0].paymentsRemaining).toBeGreaterThan(0);
  });
});

describe('getGoalProgress', () => {
  it('reports the shortfall against the inflation-adjusted target', async () => {
    const result = (await tool('getGoalProgress').run(
      {},
      fakeContext({
        goals: [
          goal({
            // Far beyond what the single allocated asset can reach, so there is
            // a shortfall to report.
            targetAmount: 50_000_000,
            allocations: [{ asset: asset({ manualValue: 150000 }), percentage: 100 }],
          }),
        ],
      })
    )) as {
      goals: {
        inflationAdjustedTarget: number;
        targetAmount: number;
        shortfall: number;
        fundedByAssets: unknown[];
      }[];
    };

    const only = result.goals[0];
    expect(only.inflationAdjustedTarget).toBeGreaterThan(only.targetAmount);
    expect(only.shortfall).toBeGreaterThan(0);
    expect(only.fundedByAssets).toHaveLength(1);
  });
});

describe('getUpcomingCommitments', () => {
  it('totals scheduled SIP instalments and EMI payments over the window', async () => {
    const result = (await tool('getUpcomingCommitments').run(
      { months: 1 },
      fakeContext({
        assets: [asset({ id: 1 })],
        sipsByAsset: { 1: [sip({ price: 5000 })] },
        loans: [loan({ emiAmount: 25000 })],
      })
    )) as {
      totalSipCommitment: number;
      totalEmiCommitment: number;
      totalCommitment: number;
      months: number;
    };

    expect(result.months).toBe(1);
    expect(result.totalSipCommitment).toBe(5000);
    expect(result.totalEmiCommitment).toBe(25000);
    expect(result.totalCommitment).toBe(30000);
  });

  it('defaults to one month and clamps an absurd window', async () => {
    const ctx = fakeContext();

    const single = (await tool('getUpcomingCommitments').run({}, ctx)) as { months: number };
    const clamped = (await tool('getUpcomingCommitments').run({ months: 900 }, ctx)) as {
      months: number;
    };

    expect(single.months).toBe(1);
    expect(clamped.months).toBe(24);
  });

  it('converts a foreign-currency EMI into the base currency', async () => {
    const result = (await tool('getUpcomingCommitments').run(
      { months: 1 },
      fakeContext({
        loans: [loan({ currency: Currency.USD, emiAmount: 100 })],
        converter: converter({ [Currency.USD]: USD_RATE }),
      })
    )) as { totalEmiCommitment: number };

    expect(result.totalEmiCommitment).toBe(100 * USD_RATE);
  });
});

describe('getExchangeRates', () => {
  it('reports the base currency and which rates are actually set', async () => {
    const result = (await tool('getExchangeRates').run(
      {},
      fakeContext({
        rates: [rate(Currency.USD, USD_RATE), rate(Currency.GBP, undefined)],
      })
    )) as {
      baseCurrency: string;
      rates: { currency: string; hasRate: boolean; updatedAt?: string }[];
    };

    expect(result.baseCurrency).toBe(Currency.INR);
    expect(result.rates.find(entry => entry.currency === Currency.USD)?.hasRate).toBe(true);
    expect(result.rates.find(entry => entry.currency === Currency.GBP)?.hasRate).toBe(false);
  });

  it('dates a rate from when it was last updated', async () => {
    const result = (await tool('getExchangeRates').run(
      {},
      fakeContext({ rates: [rate(Currency.USD, USD_RATE)] })
    )) as { rates: { updatedAt?: string }[] };

    expect(result.rates[0].updatedAt).toBe(TODAY.toISOString().split('T')[0]);
  });
});
