import { describe, expect, it } from 'vitest';
import { AssetCategory } from '../entities/assets/AssetCategory';
import { ValueModel } from '../entities/assets/ValueModel';
import { Currency } from '../entities/shared/Currency';
import { BenchmarkTrend, MarketDataPort } from '../market/MarketDataPort';
import { DecisionEntry, IDecisionEntry } from '../entities/journal/DecisionEntry';
import { reviewDecision, summariseJournal } from '../journal/DecisionReview';
import { JournalEntryWithReview } from '../services/DecisionJournalService';
import { FundTrends, FundUniversePort, SegmentScreen } from '../funds/FundUniversePort';
import { NewsPort, NewsSummary } from '../news/NewsPort';
import { CategoryNewsSentiment } from '../news/NewsSentiment';
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

function benchmarkTrend(category: string, overrides: Partial<BenchmarkTrend> = {}): BenchmarkTrend {
  return {
    category,
    benchmark: `${category} benchmark`,
    source: 'test.source',
    currency: Currency.INR,
    asOf: '2026-08-21',
    trend: {
      latest: 100,
      latestOn: new Date('2026-08-21T00:00:00.000Z'),
      high: 110,
      highOn: new Date('2026-01-02T00:00:00.000Z'),
      low: 90,
      lowOn: new Date('2026-04-01T00:00:00.000Z'),
      drawdownPercent: -9.09,
      returnPercent: 5,
      observations: 250,
      windowDays: 365,
    },
    ...overrides,
  };
}

/** Records what the tool asked for, so the defaulting logic can be asserted. */
function stubMarket(
  trends: BenchmarkTrend[],
  supported = trends.map(entry => entry.category)
): MarketDataPort & { asked: { categories: string[]; windowDays?: number }[] } {
  const asked: { categories: string[]; windowDays?: number }[] = [];
  return {
    asked,
    async benchmarkTrends(categories, windowDays) {
      asked.push({ categories, windowDays });
      return {
        trends: trends.filter(entry => categories.includes(entry.category)),
        unavailable: [],
      };
    },
    supportedCategories: () => supported,
  };
}

function segmentScreen(overrides: Partial<SegmentScreen> = {}): SegmentScreen {
  return {
    segment: 'Flexi Cap',
    category: AssetCategory.MUTUAL_FUNDS,
    sebiCategoryHint: 'Equity Scheme - Flexi Cap Fund',
    candidates: [
      {
        code: 118275,
        name: 'Canara Robeco Flexi Cap Fund - Direct Plan - GROWTH OPTION',
        fundHouse: 'Canara Robeco Mutual Fund',
        schemeCategory: 'Equity Scheme - Flexi Cap Fund',
        latestNav: 123.4567,
        navAsOf: '2026-09-01',
      },
    ],
    discardedAsStale: 2,
    truncated: false,
    totalMatched: 3,
    source: 'api.mfapi.in',
    universeFetchedAt: new Date('2026-08-30T00:00:00.000Z'),
    ...overrides,
  };
}

function stubFunds(
  screens: Record<string, SegmentScreen> = { 'Flexi Cap': segmentScreen() },
  trends: FundTrends = { funds: [], unavailable: [], source: 'api.mfapi.in' }
): FundUniversePort & { screened: string[]; compared: { codes: number[]; windowDays?: number }[] } {
  const screened: string[] = [];
  const compared: { codes: number[]; windowDays?: number }[] = [];
  return {
    screened,
    compared,
    screenableSegments: () => Object.keys(screens),
    async screenSegment(segment) {
      screened.push(segment);
      const screen = screens[segment];
      if (!screen) throw new Error(`"${segment}" is not a segment this app can screen.`);
      return screen;
    },
    async compareFunds(codes, windowDays) {
      compared.push({ codes, windowDays });
      return trends;
    },
  };
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
  type Breakdown = { from: string; byCurrency: { currency: string; total: number }[] };

  it('accepts a months argument as a relative window', async () => {
    const result = (await tool('getExpenseBreakdown').run(
      { months: 1 },
      fakeContext({
        monthlyExpenses: months([
          expense({ amount: 4000, date: new Date('2026-08-05') }),
          expense({ amount: 9000, date: new Date('2024-01-05') }),
        ]),
      })
    )) as Breakdown;

    // Only the recent expense falls inside a one-month window from TODAY.
    expect(result.byCurrency[0].total).toBe(4000);
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
    )) as Breakdown;

    expect(result.byCurrency[0].total).toBe(4000);
    expect(result.from).toBe('2026-08-01');
  });

  it('ignores a malformed date rather than failing the question', async () => {
    const result = (await tool('getExpenseBreakdown').run(
      { from: 'last March' },
      fakeContext({ monthlyExpenses: months([expense({ amount: 4000 })]) })
    )) as Breakdown;

    expect(result.byCurrency[0].total).toBe(4000);
    expect(result.from).toContain('earliest');
  });

  // Never one blended total: an expense is reported in the currency it was paid
  // in, so the assistant is handed the currencies apart and cannot add them.
  it('reports a currency per entry rather than a converted total', async () => {
    const result = (await tool('getExpenseBreakdown').run(
      {},
      fakeContext({
        monthlyExpenses: months([
          expense({ amount: 4000, currency: Currency.INR }),
          expense({ amount: 300, currency: Currency.GBP }),
        ]),
        // A rate exists, and is still not applied to spending.
        converter: converter({ [Currency.GBP]: 110 }),
      })
    )) as Breakdown;

    expect(result.byCurrency.map(entry => [entry.currency, entry.total])).toEqual([
      [Currency.INR, 4000],
      [Currency.GBP, 300],
    ]);
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

describe('runCalculation', () => {
  it('hands the snippet the records and returns what it computed', async () => {
    let seenCode = '';
    let seenData: { assets: { investedInBase: number }[] } | undefined;

    const result = (await tool('runCalculation').run(
      { code: 'return data.assets.length' },
      fakeContext({
        assets: [asset({ id: 1, invested: 400000 }), asset({ id: 2, invested: 150000 })],
        runCode: async (code, data) => {
          seenCode = code;
          seenData = data as typeof seenData;
          return { ok: true, value: 2, logs: ['counted'] };
        },
      })
    )) as { result: unknown; logs: string[]; baseCurrency: string };

    expect(seenCode).toBe('return data.assets.length');
    expect(seenData?.assets).toHaveLength(2);
    expect(seenData?.assets[0].investedInBase).toBe(400000);
    expect(result.result).toBe(2);
    expect(result.logs).toEqual(['counted']);
    expect(result.baseCurrency).toBe(Currency.INR);
  });

  it('reports a failing snippet back with an instruction not to guess', async () => {
    const result = (await tool('runCalculation').run(
      { code: 'throw new Error("nope")' },
      fakeContext({
        runCode: async () => ({ ok: false, error: 'nope', logs: [] }),
      })
    )) as { error: string; hint: string };

    expect(result.error).toBe('nope');
    expect(result.hint).toContain('Do not guess');
  });

  it('rejects a call with no code rather than running an empty snippet', async () => {
    const result = (await tool('runCalculation').run({}, fakeContext())) as { error: string };

    expect(result.error).toContain('code is required');
  });

  // An unrated currency counts as 0 everywhere else, and a snippet total that
  // quietly excluded a holding reads as complete unless it is said.
  it('passes on the unrated currencies its figures were computed with', async () => {
    const result = (await tool('runCalculation').run(
      { code: 'return 1' },
      fakeContext({
        assets: [asset({ currency: Currency.USD })],
        converter: converter(),
        runCode: async () => ({ ok: true, value: 1, logs: [] }),
      })
    )) as { unratedCurrencies: string[] };

    expect(result.unratedCurrencies).toContain(Currency.USD);
  });
});

describe('getMarketTrends', () => {
  it('defaults to the categories the user actually holds', async () => {
    const market = stubMarket(
      [benchmarkTrend(AssetCategory.GOLD), benchmarkTrend(AssetCategory.STOCK)],
      [AssetCategory.GOLD, AssetCategory.STOCK, AssetCategory.DEBT]
    );

    await tool('getMarketTrends').run(
      {},
      fakeContext({
        assets: [
          asset({ id: 1, category: AssetCategory.GOLD }),
          asset({ id: 2, category: AssetCategory.STOCK }),
        ],
        market,
      })
    );

    expect(market.asked).toHaveLength(1);
    expect(market.asked[0].categories.sort()).toEqual([AssetCategory.GOLD, AssetCategory.STOCK]);
    expect(market.asked[0].windowDays).toBe(365);
  });

  it('drops a requested category that has no benchmark instead of inventing one', async () => {
    const market = stubMarket([benchmarkTrend(AssetCategory.GOLD)], [AssetCategory.GOLD]);

    const result = (await tool('getMarketTrends').run(
      { categories: [AssetCategory.GOLD, AssetCategory.REAL_ESTATE] },
      fakeContext({ market })
    )) as { trends: unknown[] };

    expect(market.asked[0].categories).toEqual([AssetCategory.GOLD]);
    expect(result.trends).toHaveLength(1);
  });

  it('reports the categories as unavailable when none of them has a benchmark', async () => {
    const result = (await tool('getMarketTrends').run(
      { categories: [AssetCategory.REAL_ESTATE] },
      fakeContext({ market: stubMarket([], []) })
    )) as { trends: unknown[]; unavailable: { category: string }[]; note: string };

    expect(result.trends).toEqual([]);
    expect(result.unavailable).toEqual([
      {
        category: AssetCategory.REAL_ESTATE,
        reason: 'no market benchmark describes this category',
      },
    ]);
    expect(result.note).toContain('from memory');
  });

  it('keeps the drawdown and the window return as separate figures', async () => {
    // Gold's real shape in August 2026: up strongly over the year, yet well
    // below the high it set inside it. Collapsing these two into one number is
    // exactly the error that turns a rally into a apparent crash.
    const market = stubMarket([
      benchmarkTrend(AssetCategory.GOLD, {
        trend: {
          ...benchmarkTrend(AssetCategory.GOLD).trend,
          drawdownPercent: -10.5,
          returnPercent: 58.78,
        },
      }),
    ]);

    const result = (await tool('getMarketTrends').run(
      {},
      fakeContext({ assets: [asset({ category: AssetCategory.GOLD })], market })
    )) as { trends: { drawdownFromHighPercent: number; returnOverWindowPercent: number }[] };

    expect(result.trends[0].drawdownFromHighPercent).toBe(-10.5);
    expect(result.trends[0].returnOverWindowPercent).toBe(58.78);
  });

  it('carries the as-of date and the benchmark name through for attribution', async () => {
    const market = stubMarket([
      benchmarkTrend(AssetCategory.GOLD, { benchmark: 'Gold in INR', asOf: '2026-08-19' }),
    ]);

    const result = (await tool('getMarketTrends').run(
      {},
      fakeContext({ assets: [asset({ category: AssetCategory.GOLD })], market })
    )) as { trends: { asOf: string; benchmark: string; source: string }[] };

    expect(result.trends[0].asOf).toBe('2026-08-19');
    expect(result.trends[0].benchmark).toBe('Gold in INR');
    expect(result.trends[0].source).toBe('test.source');
  });

  it('clamps an absurd window rather than passing it through', async () => {
    const market = stubMarket([benchmarkTrend(AssetCategory.GOLD)]);

    await tool('getMarketTrends').run(
      { windowDays: 1 },
      fakeContext({ assets: [asset({ category: AssetCategory.GOLD })], market })
    );

    expect(market.asked[0].windowDays).toBe(30);
  });
});

describe('getAllocationDrift', () => {
  /** Worth exactly `value` whatever day the suite runs on. */
  function holding(category: string, value: number) {
    return asset({
      category,
      valueModel: ValueModel.FIXED_INCOME,
      interestRate: 0,
      invested: value,
    });
  }

  it('says plainly when no policy is set instead of reporting a zero drift', async () => {
    const result = (await tool('getAllocationDrift').run(
      {},
      fakeContext({ assets: [holding(AssetCategory.STOCK, 100000)] })
    )) as { hasTargetAllocation: boolean; note: string };

    expect(result.hasTargetAllocation).toBe(false);
    expect(result.note).toContain('Do not invent a target');
  });

  it('reports the gap and what would close it', async () => {
    const result = (await tool('getAllocationDrift').run(
      {},
      fakeContext({
        assets: [holding(AssetCategory.STOCK, 700000), holding(AssetCategory.DEBT, 300000)],
        targetAllocation: [
          { category: AssetCategory.STOCK, targetPercent: 50 },
          { category: AssetCategory.DEBT, targetPercent: 50 },
        ],
      })
    )) as {
      hasTargetAllocation: boolean;
      rows: { category: string; driftPercent: number; adjustmentAmount: number; action: string }[];
    };

    expect(result.hasTargetAllocation).toBe(true);
    const stock = result.rows.find(row => row.category === AssetCategory.STOCK);
    expect(stock?.driftPercent).toBe(20);
    expect(stock?.adjustmentAmount).toBe(-200000);
    expect(stock?.action).toBe('sell');
  });
});

describe('getNewsSentiment', () => {
  function categorySummary(
    category: string,
    overrides: Partial<CategoryNewsSentiment> = {}
  ): CategoryNewsSentiment {
    return {
      category,
      articleCount: 12,
      meanSentiment: -0.22,
      label: 'Somewhat-Bearish',
      distribution: { bullish: 2, neutral: 4, bearish: 6 },
      newestAt: new Date('2026-08-22T09:00:00.000Z'),
      oldestAt: new Date('2026-08-20T09:00:00.000Z'),
      isThinSample: false,
      topArticles: [
        {
          title: 'Rate cut hopes fade',
          url: 'https://example.test/a',
          source: 'Example Wire',
          publishedAt: new Date('2026-08-22T09:00:00.000Z'),
          summary: 's',
          sentimentScore: -0.4,
          sentimentLabel: 'Bearish',
          topics: [{ topic: 'economy_macro', relevance: 1 }],
        },
      ],
      ...overrides,
    };
  }

  function stubNews(summary: Partial<NewsSummary>): NewsPort & { asked: string[][] } {
    const asked: string[][] = [];
    return {
      asked,
      async summarise(categories) {
        asked.push(categories);
        return {
          summaries: [],
          articlesConsidered: 50,
          fetchedAt: new Date('2026-08-22T10:00:00.000Z'),
          source: 'test.source',
          unavailable: [],
          ...summary,
        };
      },
      supportedCategories: () => [AssetCategory.GOLD, AssetCategory.DEBT],
    };
  }

  it('defaults to the categories the user holds', async () => {
    const news = stubNews({ summaries: [categorySummary(AssetCategory.GOLD)] });

    await tool('getNewsSentiment').run(
      {},
      fakeContext({ assets: [asset({ category: AssetCategory.GOLD })], news })
    );

    expect(news.asked[0]).toEqual([AssetCategory.GOLD]);
  });

  it('reports the measurement, the window and the headline behind it', async () => {
    const news = stubNews({ summaries: [categorySummary(AssetCategory.DEBT)] });

    const result = (await tool('getNewsSentiment').run(
      { categories: [AssetCategory.DEBT] },
      fakeContext({ news })
    )) as {
      fetchedAt?: string;
      articlesConsidered: number;
      categories: {
        meanSentiment?: number;
        label?: string;
        articleCount: number;
        newestArticleAt?: string;
        oldestArticleAt?: string;
        headlines: { title: string; source: string }[];
      }[];
    };

    const entry = result.categories[0];
    expect(result.fetchedAt).toBe('2026-08-22');
    expect(result.articlesConsidered).toBe(50);
    expect(entry.meanSentiment).toBe(-0.22);
    expect(entry.label).toBe('Somewhat-Bearish');
    expect(entry.articleCount).toBe(12);
    expect(entry.oldestArticleAt).toBe('2026-08-20');
    expect(entry.newestArticleAt).toBe('2026-08-22');
    // Cited rather than recalled — the point of returning headlines at all.
    expect(entry.headlines[0]).toMatchObject({
      title: 'Rate cut hopes fade',
      source: 'Example Wire',
    });
  });

  it('passes the thin-sample flag through with the figure rather than hiding it', async () => {
    const news = stubNews({
      summaries: [
        categorySummary(AssetCategory.GOLD, {
          articleCount: 2,
          isThinSample: true,
          meanSentiment: -0.6,
        }),
      ],
    });

    const result = (await tool('getNewsSentiment').run(
      { categories: [AssetCategory.GOLD] },
      fakeContext({ news })
    )) as { categories: { isThinSample: boolean; meanSentiment?: number }[]; note: string };

    expect(result.categories[0].isThinSample).toBe(true);
    expect(result.categories[0].meanSentiment).toBe(-0.6);
    expect(result.note).toContain('thin sample');
  });

  it('reports no sentiment at all rather than neutral when nothing matched', async () => {
    const news = stubNews({
      summaries: [
        categorySummary(AssetCategory.GOLD, {
          articleCount: 0,
          meanSentiment: undefined,
          label: undefined,
          isThinSample: true,
          topArticles: [],
          newestAt: undefined,
          oldestAt: undefined,
        }),
      ],
    });

    const result = (await tool('getNewsSentiment').run(
      { categories: [AssetCategory.GOLD] },
      fakeContext({ news })
    )) as { categories: { meanSentiment?: number; label?: string; newestArticleAt?: string }[] };

    expect(result.categories[0].meanSentiment).toBeUndefined();
    expect(result.categories[0].label).toBeUndefined();
    expect(result.categories[0].newestArticleAt).toBeUndefined();
  });

  it('passes on why a category could not be answered', async () => {
    const news = stubNews({
      summaries: [],
      unavailable: [
        { category: AssetCategory.FIXED_DEPOSIT, reason: 'news does not move this category' },
      ],
    });

    const result = (await tool('getNewsSentiment').run(
      { categories: [AssetCategory.FIXED_DEPOSIT] },
      fakeContext({ news })
    )) as { unavailable: { category: string; reason: string }[] };

    expect(result.unavailable[0].category).toBe(AssetCategory.FIXED_DEPOSIT);
  });

  it('omits the fetch date when nothing was ever fetched', async () => {
    // The unconfigured port reports epoch, which must not surface as 1970.
    const result = (await tool('getNewsSentiment').run(
      { categories: [AssetCategory.GOLD] },
      fakeContext()
    )) as { fetchedAt?: string; unavailable: { reason: string }[] };

    expect(result.fetchedAt).toBeUndefined();
    expect(result.unavailable[0].reason).toContain('no news provider');
  });

  it('says the portfolio is empty rather than returning a silent nothing', async () => {
    const result = (await tool('getNewsSentiment').run({}, fakeContext())) as {
      categories: unknown[];
      note: string;
    };

    expect(result.categories).toEqual([]);
    expect(result.note).toContain('portfolio is empty');
  });
});

describe('getDecisionJournal', () => {
  const NOW = new Date('2026-08-20T00:00:00.000Z');

  function journalEntry(overrides: Partial<IDecisionEntry> = {}): DecisionEntry {
    return new DecisionEntry({
      id: 1,
      createdAt: new Date('2026-03-01T00:00:00.000Z'),
      category: AssetCategory.GOLD,
      action: 'sell',
      status: 'acted',
      amount: 150000,
      currency: Currency.INR,
      rationale: 'Gold ran to 35% against a 20% target.',
      evidence: { benchmarkLevel: 50, driftPercent: 15, targetPercent: 20 },
      reviewedAt: undefined,
      reviewNote: undefined,
      ...overrides,
    });
  }

  function journal(items: { entry: DecisionEntry; currentLevel?: number }[]): {
    entries: JournalEntryWithReview[];
    summary: ReturnType<typeof summariseJournal>;
  } {
    const entries = items.map(item => ({
      entry: item.entry,
      review: reviewDecision(item.entry, item.currentLevel, NOW),
    }));
    return { entries, summary: summariseJournal(entries.map(item => item.review)) };
  }

  it('reports an empty journal without failing', async () => {
    const result = (await tool('getDecisionJournal').run({}, fakeContext())) as {
      entries: { items: unknown[] };
      summary: { entryCount: number; hitRatePercent?: number };
    };

    expect(result.entries.items).toEqual([]);
    expect(result.summary.entryCount).toBe(0);
    expect(result.summary.hitRatePercent).toBeUndefined();
  });

  it('returns the reasoning, the frozen evidence and the verdict', async () => {
    const result = (await tool('getDecisionJournal').run(
      {},
      // Gold benchmark down since the sell, so the reasoning held up.
      fakeContext({ decisionJournal: journal([{ entry: journalEntry(), currentLevel: 44 }]) })
    )) as {
      entries: {
        items: {
          decidedOn: string;
          rationale: string;
          evidenceAtTheTime: Record<string, number>;
          benchmarkChangeSincePercent: number;
          verdict: string;
          daysSince: number;
        }[];
      };
    };

    const item = result.entries.items[0];
    expect(item.decidedOn).toBe('2026-03-01');
    expect(item.rationale).toBe('Gold ran to 35% against a 20% target.');
    expect(item.evidenceAtTheTime.driftPercent).toBe(15);
    expect(item.benchmarkChangeSincePercent).toBe(-12);
    expect(item.verdict).toBe('direction-right');
    expect(item.daysSince).toBe(172);
  });

  it('filters by category', async () => {
    const result = (await tool('getDecisionJournal').run(
      { category: AssetCategory.GOLD },
      fakeContext({
        decisionJournal: journal([
          { entry: journalEntry({ id: 1, category: AssetCategory.GOLD }), currentLevel: 44 },
          { entry: journalEntry({ id: 2, category: AssetCategory.STOCK }), currentLevel: 44 },
        ]),
      })
    )) as { entries: { items: { id: number }[] } };

    expect(result.entries.items.map(item => item.id)).toEqual([1]);
  });

  it('spells out that the hit rate is over scored decisions, not all of them', async () => {
    const result = (await tool('getDecisionJournal').run(
      {},
      fakeContext({
        decisionJournal: journal([
          { entry: journalEntry({ id: 1 }), currentLevel: 44 },
          // Too recent to score.
          { entry: journalEntry({ id: 2, createdAt: new Date('2026-08-10') }), currentLevel: 44 },
        ]),
      })
    )) as {
      summary: { entryCount: number; scoredCount: number; hitRatePercent?: number; note: string };
    };

    expect(result.summary.entryCount).toBe(2);
    expect(result.summary.scoredCount).toBe(1);
    expect(result.summary.note).toContain('scoredCount');
    expect(result.summary.note).toContain('denominator');
  });

  it('warns that a verdict is not a return', async () => {
    const result = (await tool('getDecisionJournal').run({}, fakeContext())) as { note: string };

    // The distinction the whole feature rests on: it scores the reasoning, not
    // the money.
    expect(result.note).toContain('not what the user actually earned');
  });

  it('caps a long journal and says so', async () => {
    const many = Array.from({ length: 30 }, (_, index) => ({
      entry: journalEntry({ id: index + 1 }),
      currentLevel: 44,
    }));

    const result = (await tool('getDecisionJournal').run(
      { limit: 5 },
      fakeContext({ decisionJournal: journal(many) })
    )) as { entries: { items: unknown[]; truncated: boolean; totalCount: number } };

    expect(result.entries.items).toHaveLength(5);
    expect(result.entries.truncated).toBe(true);
    expect(result.entries.totalCount).toBe(30);
  });
});

describe('screenFunds', () => {
  it('screens the segments of the categories the user is underweight in', async () => {
    // The default is what attaches a suggestion to a reason: a fund is worth
    // adding where the policy says the user is short, not because a segment came
    // to mind. Gold is 30 points under target here and equity is over.
    const funds = stubFunds({
      Gold: segmentScreen({ segment: 'Gold', category: AssetCategory.GOLD }),
      'Flexi Cap': segmentScreen(),
    });

    await tool('screenFunds').run(
      {},
      fakeContext({
        assets: [asset({ id: 1, category: AssetCategory.MUTUAL_FUNDS, manualValue: 100000 })],
        targetAllocation: [
          { category: AssetCategory.MUTUAL_FUNDS, targetPercent: 70 },
          { category: AssetCategory.GOLD, targetPercent: 30 },
        ],
        funds,
      })
    );

    expect(funds.screened).toEqual(['Gold']);
  });

  it('asks rather than screening when nothing is underweight and nothing was asked for', async () => {
    // No segment and no reason to pick one is a question, not an arbitrary
    // screen — and the reply has to be able to name what it could screen.
    const funds = stubFunds();

    const result = (await tool('screenFunds').run(
      {},
      fakeContext({ assets: [], targetAllocation: [], funds })
    )) as { segments: unknown[]; availableSegments: string[]; note: string };

    expect(funds.screened).toEqual([]);
    expect(result.segments).toEqual([]);
    expect(result.availableSegments).toContain('Flexi Cap');
    expect(result.note).toContain('Ask');
  });

  it('reports a segment it cannot screen without failing the others', async () => {
    // A model will invent a plausible segment name. One bad name must not cost
    // the whole screen, and it must come back as a reason rather than silence.
    const funds = stubFunds();

    const result = (await tool('screenFunds').run(
      { segments: ['Flexi Cap', 'Thematic Infrastructure'] },
      fakeContext({ funds })
    )) as { segments: { segment: string }[]; unavailable: { segment: string; reason: string }[] };

    expect(result.segments.map(entry => entry.segment)).toEqual(['Flexi Cap']);
    expect(result.unavailable).toHaveLength(1);
    expect(result.unavailable[0].segment).toBe('Thematic Infrastructure');
  });

  it('passes on how many schemes were discarded for having stopped publishing', async () => {
    // The count is the honesty: it says the screen excluded funds rather than
    // that the segment is small, and it is what lets the reply explain why a
    // fund the user half-remembers is not in the list.
    const result = (await tool('screenFunds').run(
      { segments: ['Flexi Cap'] },
      fakeContext({ funds: stubFunds() })
    )) as {
      segments: {
        discardedAsStale: number;
        liveSchemeCount: number;
        candidates: { items: { schemeCode: number; navAsOf: string; latestNav: number }[] };
      }[];
    };

    const screen = result.segments[0];
    expect(screen.discardedAsStale).toBe(2);
    expect(screen.liveSchemeCount).toBe(1);
    expect(screen.candidates.items[0].schemeCode).toBe(118275);
    expect(screen.candidates.items[0].navAsOf).toBe('2026-09-01');
    expect(screen.candidates.items[0].latestNav).toBe(123.46);
  });

  it('reports no performance figure at all', async () => {
    // Load-bearing: a segment listed with returns reads as a ranking of fund
    // quality, and position one gets recommended for having already run. The
    // figures live in compareFunds, over a shortlist, with the drawdown beside
    // them.
    const result = (await tool('screenFunds').run(
      { segments: ['Flexi Cap'] },
      fakeContext({ funds: stubFunds() })
    )) as { segments: { candidates: { items: Record<string, unknown>[] } }[] };

    const fields = Object.keys(result.segments[0].candidates.items[0]);
    expect(fields).not.toContain('returnOverWindowPercent');
    expect(fields).not.toContain('drawdownFromHighPercent');
  });

  it('says a fund cannot be named when the list is unreachable', async () => {
    // The default port when nothing is configured. "No funds" and "the list did
    // not load" must never look the same, or the model fills the gap.
    const result = (await tool('screenFunds').run({}, fakeContext({ funds: stubFunds({}) }))) as {
      segments: unknown[];
      note: string;
    };

    expect(result.segments).toEqual([]);
    expect(result.note).toContain('from memory');
  });

  it('tells the reply that the expense ratio is not in these records', async () => {
    // The variable that most decides between two funds in a segment is absent
    // from the feed, so the note has to say so — otherwise it gets filled in.
    const result = (await tool('screenFunds').run(
      { segments: ['Flexi Cap'] },
      fakeContext({ funds: stubFunds() })
    )) as { note: string };

    expect(result.note).toContain('expense ratio');
    expect(result.note).toContain('direct-plan');
  });
});

describe('compareFunds', () => {
  const trend = {
    latest: 90.7896,
    latestOn: new Date('2026-09-01T00:00:00.000Z'),
    high: 101.5,
    highOn: new Date('2026-06-15T00:00:00.000Z'),
    low: 70,
    lowOn: new Date('2025-10-01T00:00:00.000Z'),
    drawdownPercent: -10.55,
    returnPercent: 22.4,
    observations: 248,
    windowDays: 364,
  };

  it('reports the drawdown and the window return as separate figures', async () => {
    // The pair that must never be conflated: this fund is up 22% over the year
    // and still 10.5% below a high it set inside it.
    const result = (await tool('compareFunds').run(
      { schemeCodes: [122639] },
      fakeContext({
        funds: stubFunds(undefined, {
          funds: [
            {
              code: 122639,
              name: 'Parag Parikh Flexi Cap Fund - Direct Plan - Growth',
              fundHouse: 'PPFAS Mutual Fund',
              asOf: '2026-09-01',
              trend,
            },
          ],
          unavailable: [],
          source: 'api.mfapi.in',
        }),
      })
    )) as {
      funds: {
        drawdownFromHighPercent: number;
        returnOverWindowPercent: number;
        asOf: string;
        windowHighOn: string;
      }[];
    };

    expect(result.funds[0].drawdownFromHighPercent).toBe(-10.55);
    expect(result.funds[0].returnOverWindowPercent).toBe(22.4);
    expect(result.funds[0].asOf).toBe('2026-09-01');
    expect(result.funds[0].windowHighOn).toBe('2026-06-15');
  });

  it('sends the user back to the screen when given no code', async () => {
    // A scheme code the model recalls is not a scheme code. Without this the
    // tool would answer an empty comparison, which reads as "these funds have no
    // history" rather than "you did not name one".
    const funds = stubFunds();

    const result = (await tool('compareFunds').run({}, fakeContext({ funds }))) as {
      funds: unknown[];
      note: string;
    };

    expect(funds.compared).toEqual([]);
    expect(result.funds).toEqual([]);
    expect(result.note).toContain('screenFunds');
  });

  it('clamps an absurd window rather than refusing it', async () => {
    const funds = stubFunds();

    await tool('compareFunds').run({ schemeCodes: [1], windowDays: 5 }, fakeContext({ funds }));
    await tool('compareFunds').run({ schemeCodes: [1], windowDays: 99999 }, fakeContext({ funds }));

    expect(funds.compared.map(entry => entry.windowDays)).toEqual([30, 3650]);
  });

  it('passes on the schemes whose history could not be read', async () => {
    const result = (await tool('compareFunds').run(
      { schemeCodes: [1, 2] },
      fakeContext({
        funds: stubFunds(undefined, {
          funds: [],
          unavailable: [{ code: 2, reason: 'the source returned no history' }],
          source: 'api.mfapi.in',
        }),
      })
    )) as { unavailable: { code: number }[] };

    expect(result.unavailable).toEqual([{ code: 2, reason: 'the source returned no history' }]);
  });
});
