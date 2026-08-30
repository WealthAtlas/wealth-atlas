import { Investment } from '../entities/assets/Investment';
import { computeAssetPortfolioTotals } from '../services/AssetService';
import {
  computeAssetCategoryData,
  computeDashboardMetrics,
  computeMonthlyInvestmentData,
} from '../services/DashboardService';
import { computeExpenseBreakdown } from '../services/ExpenseService';
import { computeAllocationDrift } from '../market/AllocationDrift';
import { MIN_REVIEW_DAYS } from '../journal/DecisionReview';
import { THIN_SAMPLE_BELOW } from '../news/NewsSentiment';
import { computeGoalPortfolioTotals, computeGoalProgress } from '../services/GoalService';
import { computeLoanPortfolioTotals } from '../services/LoanService';
import { addUtcMonths, isoDate, monthKey } from '../utils/DateUtils';
import { computeUpcomingCommitments } from './ChatCommitments';
import { ChatToolContext } from './ChatToolContext';
import { buildSandboxData } from './SandboxData';

/**
 * The read-only surface the assistant can call. Every tool answers from the
 * domain services, so a figure it reports is the same figure the matching page
 * shows — there is no second implementation to drift.
 *
 * Two rules hold across all of them:
 *
 * - Asset, loan and goal amounts are in the base currency, and any such
 *   aggregate carries the `unratedCurrencies` it was computed with. Expenses are
 *   the exception: they are never converted, so every expense figure is reported
 *   under the currency it was paid in. An unrated currency converts to 0
 *   (see `CurrencyConverter`), so a total is only trustworthy alongside that
 *   list, and the prompt requires the assistant to pass it on.
 * - List results are capped and say so in `truncated`/`totalCount`, so a large
 *   database cannot quietly fill the context window.
 */

export interface ChatTool {
  name: string;
  /** One line, interpolated into the system prompt. */
  description: string;
  /** Accepted arguments, also interpolated into the prompt. */
  argsHint?: string;
  run(args: Record<string, unknown>, ctx: ChatToolContext): Promise<unknown>;
}

const LIST_LIMIT = 60;

function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : undefined;
}

/** Accepts the `YYYY-MM-DD` the prompt asks for; anything else is ignored. */
function asDate(value: unknown): Date | undefined {
  const text = asString(value);
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) return undefined;
  const parsed = new Date(`${text}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function capped<T>(items: T[], limit = LIST_LIMIT) {
  return {
    totalCount: items.length,
    truncated: items.length > limit,
    items: items.slice(0, limit),
  };
}

function round(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Math.round(value * 100) / 100;
}

/** Months back from `today`, as a `from` bound. */
function monthsBefore(today: Date, months: number): Date {
  return addUtcMonths(today, -months);
}

export const CHAT_TOOLS: ChatTool[] = [
  {
    name: 'getPortfolioSummary',
    description:
      'Net worth, total asset value, outstanding loans, amount invested and overall profit or loss.',
    async run(_args, ctx) {
      const [assets, loans] = await Promise.all([ctx.assets(), ctx.loans()]);
      return computeDashboardMetrics(assets, loans, ctx.converter);
    },
  },

  {
    name: 'getAssetAllocation',
    description:
      'Value and percentage share of the portfolio held in each asset category, largest first.',
    async run(_args, ctx) {
      const assets = await ctx.assets();
      return {
        // Renamed from the chart-shaped {id, label} the compute function
        // returns: the model reads these keys, and "category" is unambiguous.
        categories: computeAssetCategoryData(assets, ctx.converter).map(entry => ({
          category: entry.label,
          value: round(entry.value),
          percentage: round(entry.percentage),
        })),
        currency: ctx.converter.getBaseCurrency(),
        unratedCurrencies: ctx.converter.getUnratedCurrencies(assets.map(asset => asset.currency)),
      };
    },
  },

  {
    name: 'listAssets',
    description:
      'Every asset with its id, category, amount invested, current value, profit or loss and IRR. Use the id with getAssetDetail.',
    argsHint: 'category?: string to filter by asset category',
    async run(args, ctx) {
      const category = asString(args.category);
      const assets = await ctx.assets();
      const filtered = category
        ? assets.filter(asset => asset.category.toLowerCase() === category.toLowerCase())
        : assets;

      const totals = computeAssetPortfolioTotals(filtered, ctx.converter);

      return {
        ...capped(
          filtered.map(asset => ({
            id: asset.id,
            name: asset.name,
            category: asset.category,
            currency: asset.currency,
            valueModel: asset.valueModel,
            // Reported in the asset's own currency, with the base-currency
            // equivalent alongside, so a per-asset figure can be quoted either
            // way without the assistant doing arithmetic.
            invested: round(asset.getTotalInvestedAmount()),
            investedInBase: round(
              ctx.converter.toBase(asset.getTotalInvestedAmount(), asset.currency)
            ),
            currentValue: round(asset.getValue()),
            currentValueInBase: round(ctx.converter.toBase(asset.getValue() ?? 0, asset.currency)),
            profitLoss: round(asset.getProfitLoss()),
            irrPercentage: round(asset.getIRR()),
            quantityHeld: round(asset.getTotalQty()),
          }))
        ),
        totals,
        baseCurrency: ctx.converter.getBaseCurrency(),
      };
    },
  },

  {
    name: 'getAssetDetail',
    description:
      'One asset in full: its valuation model, transactions and active SIPs. Needs an id from listAssets.',
    argsHint: 'assetId: number (required)',
    async run(args, ctx) {
      const assetId = asNumber(args.assetId);
      if (assetId === undefined) return { error: 'assetId is required.' };

      const asset = (await ctx.assets()).find(candidate => candidate.id === assetId);
      if (!asset) return { error: `No asset with id ${assetId}.` };

      const sips = await ctx.sipsOf(assetId);
      const transactions = asset.getInvestments(ctx.today, false);

      return {
        id: asset.id,
        name: asset.name,
        description: asset.description,
        category: asset.category,
        currency: asset.currency,
        valueModel: asset.valueModel,
        interestRate: asset.interestRate,
        maturityDate: asset.maturityDate ? isoDate(asset.maturityDate) : undefined,
        maturityAmount: asset.maturityAmount,
        invested: round(asset.getTotalInvestedAmount()),
        currentValue: round(asset.getValue()),
        currentValueInBase: round(ctx.converter.toBase(asset.getValue() ?? 0, asset.currency)),
        profitLoss: round(asset.getProfitLoss()),
        irrPercentage: round(asset.getIRR()),
        quantityHeld: round(asset.getTotalQty()),
        marketValueAsOf: asset.getMarketValueDate()
          ? isoDate(asset.getMarketValueDate()!)
          : undefined,
        transactions: capped(
          transactions.map((transaction: Investment) => ({
            date: isoDate(transaction.date),
            type: transaction.type,
            quantity: transaction.quantity,
            totalAmount: transaction.totalAmount,
          }))
        ),
        activeSIPs: sips
          .filter(sip => !sip.endDate || sip.endDate > ctx.today)
          .map(sip => ({
            amountPerInstalment: sip.price,
            quantityPerInstalment: sip.quantity,
            frequency: sip.frequency,
            startDate: isoDate(sip.startDate),
            endDate: sip.endDate ? isoDate(sip.endDate) : undefined,
          })),
        baseCurrency: ctx.converter.getBaseCurrency(),
      };
    },
  },

  {
    name: 'getMonthlyInvestments',
    description: 'How much was invested in each of the last 12 months.',
    async run(_args, ctx) {
      const monthly = computeMonthlyInvestmentData(await ctx.assets(), ctx.converter);
      return {
        months: monthly.map(month => ({
          month: monthKey(month.date),
          amount: round(month.amount),
        })),
        currency: ctx.converter.getBaseCurrency(),
      };
    },
  },

  {
    name: 'getExpenseBreakdown',
    description:
      'Spending over a period: total, essential versus non-essential, per-category shares and a per-month series. Reported once per currency spent in — expenses are never converted, so quote each currency separately and never add them together.',
    argsHint:
      'from?: "YYYY-MM-DD", to?: "YYYY-MM-DD", months?: number (last N months, used when from is absent)',
    async run(args, ctx) {
      const months = asNumber(args.months);
      const from = asDate(args.from) ?? (months ? monthsBefore(ctx.today, months) : undefined);
      const to = asDate(args.to);

      return {
        from: from ? isoDate(from) : 'earliest recorded expense',
        to: to ? isoDate(to) : 'latest recorded expense',
        byCurrency: computeExpenseBreakdown(await ctx.monthlyExpenses(), {
          ...(from ? { from } : {}),
          ...(to ? { to } : {}),
        }),
      };
    },
  },

  {
    name: 'listExpenses',
    description:
      'Individual expense rows, newest first, each in the currency it was paid in. Use when the totals are not enough and the actual entries matter.',
    argsHint:
      'from?: "YYYY-MM-DD", to?: "YYYY-MM-DD", category?: string, months?: number (last N months)',
    async run(args, ctx) {
      const months = asNumber(args.months);
      const from = asDate(args.from) ?? (months ? monthsBefore(ctx.today, months) : undefined);
      const to = asDate(args.to);
      const category = asString(args.category);

      const expenses = (await ctx.monthlyExpenses())
        .flatMap(month => month.expenses)
        .filter(expense => !from || expense.date >= from)
        .filter(expense => !to || expense.date <= to)
        .filter(expense => !category || expense.category.toLowerCase() === category.toLowerCase())
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      // No base-currency column: an expense is reported in the currency it was
      // paid in and nothing here converts.
      return capped(
        expenses.map(expense => ({
          date: isoDate(expense.date),
          amount: expense.amount,
          currency: expense.currency,
          category: expense.category,
          isEssential: expense.isEssential,
          description: expense.description,
        }))
      );
    },
  },

  {
    name: 'getLoanSummary',
    description:
      'Every loan with outstanding balance, amount paid, interest, next payment date and payments remaining.',
    async run(_args, ctx) {
      const loans = await ctx.loans();

      return {
        totals: computeLoanPortfolioTotals(loans, ctx.converter),
        loans: loans.map(loan => ({
          id: loan.id,
          name: loan.name,
          currency: loan.currency,
          principalAmount: loan.principalAmount,
          startDate: isoDate(loan.startDate),
          outstanding: round(loan.getOutstandingAmount()),
          outstandingInBase: round(
            ctx.converter.toBase(loan.getOutstandingAmount(), loan.currency)
          ),
          paid: round(loan.getPaidAmount()),
          interest: round(loan.getInterestAmount()),
          irrPercentage: round(loan.getIRR()),
          isFullyPaid: loan.isFullyPaid(),
          nextPaymentDate: loan.getNextPaymentDate()
            ? isoDate(loan.getNextPaymentDate()!)
            : undefined,
          paymentsRemaining: loan.getPendingPaymentsCount(),
          paymentsMade: loan.getPaidPaymentsCount(),
        })),
      };
    },
  },

  {
    name: 'getGoalProgress',
    description:
      'Every goal with its target, inflation-adjusted target, projected value at maturity, shortfall and years remaining.',
    async run(_args, ctx) {
      const goals = await ctx.goals();

      return {
        totals: computeGoalPortfolioTotals(goals, ctx.converter),
        goals: goals.map(goal => {
          const progress = computeGoalProgress(goal, ctx.converter);
          return {
            id: goal.id,
            name: goal.name,
            maturityDate: isoDate(goal.maturityDate),
            inflationRatePercentage: round(goal.inflationRate * 100),
            targetAmount: round(progress.targetAmount),
            inflationAdjustedTarget: round(progress.inflationAdjustedTarget),
            projectedValueAtMaturity: round(progress.projectedValue),
            valueToday: round(progress.currentValue),
            progressPercentage: round(progress.progressPercentage),
            shortfall: round(progress.shortfall),
            yearsToMaturity: round(progress.yearsToMaturity),
            fundedByAssets: goal.allocations.map(allocation => ({
              assetId: allocation.assetId,
              assetName: allocation.asset.name,
              allocationPercentage: allocation.allocationPercentage,
            })),
          };
        }),
      };
    },
  },

  {
    name: 'getUpcomingCommitments',
    description:
      'Money already committed over the coming months: scheduled SIP instalments and loan EMI payments. Use this before suggesting new investments.',
    argsHint: 'months?: number, default 1',
    async run(args, ctx) {
      const months = Math.min(Math.max(asNumber(args.months) ?? 1, 1), 24);
      const commitments = await computeUpcomingCommitments(ctx, months);

      return {
        ...commitments,
        sipInstalments: capped(commitments.sipInstalments),
        emiPayments: capped(commitments.emiPayments),
        currency: ctx.converter.getBaseCurrency(),
      };
    },
  },

  {
    name: 'runCalculation',
    description:
      'Run a short JavaScript snippet to work out a figure the other tools do not return — a projection, a what-if, a comparison, or a total over a set you have filtered yourself. Prefer this over doing arithmetic in your head.',
    argsHint:
      'code: string — the body of an async function. It receives `data` ({today, baseCurrency, unratedCurrencies, assets[], loans[], goals[], monthlyExpenses[]}, all amounts already in the base currency, keys as in listAssets/getLoanSummary/getGoalProgress; asset, loan and goal amounts are in the base currency, while monthlyExpenses[].byCurrency keeps each currency apart and unconverted) and must `return` a number or a plain object. No network and no database access; console.log is echoed back.',
    async run(args, ctx) {
      const code = asString(args.code);
      if (code === undefined) return { error: 'code is required.' };

      const data = await buildSandboxData(ctx);
      const outcome = await ctx.runCode(code, data);

      if (!outcome.ok) {
        return {
          error: outcome.error ?? 'The snippet failed.',
          logs: outcome.logs,
          // Named so a retry fixes the snippet rather than inventing the answer.
          hint: 'Fix the snippet and call runCalculation again, or say you could not work it out. Do not guess the result.',
        };
      }

      return {
        result: outcome.value,
        logs: outcome.logs,
        baseCurrency: ctx.converter.getBaseCurrency(),
        // The snippet computed over the same zeroed figures as everything else.
        unratedCurrencies: data.unratedCurrencies,
        ...(data.truncated.length > 0 ? { truncatedInputs: data.truncated } : {}),
      };
    },
  },

  {
    name: 'getAllocationDrift',
    description:
      "The user's intended allocation against what they actually hold: the target share per asset category, the current share, the gap in percentage points, the amount that would close it, and whether that gap is outside the tolerance band. This is what sizes a buy or a sell. Returns hasTargetAllocation:false when the user has not set a policy — then ask them what they were aiming for rather than assuming one.",
    async run(_args, ctx) {
      const targets = await ctx.targetAllocation();

      if (targets.length === 0) {
        return {
          hasTargetAllocation: false,
          note: 'No target allocation is set, so there is no drift to report. Ask the user what share of their portfolio they want in each category. Do not invent a target or suggest one as though it were theirs.',
        };
      }

      const drift = computeAllocationDrift(await ctx.assets(), targets, ctx.converter);

      return {
        hasTargetAllocation: true,
        ...drift,
        note:
          'adjustmentAmount is the size of the gap in base currency: positive is the amount the ' +
          'category is short, negative the amount it is over. A row with action "hold" is inside ' +
          'its band and needs nothing. "sell" names the direction of the gap, not the remedy — an ' +
          'overweight category is usually overweight because it rose, and directing new ' +
          'contributions elsewhere closes the gap without a taxable sale.',
      };
    },
  },

  {
    name: 'getMarketTrends',
    description:
      "How the market a category sits in has actually moved: the benchmark's latest level, its high over the window, how far below that high it is now, and the return over the window. Use this to tell a fall that is a discount from one that is a trend, and to check an instinct about timing against a real series. Reports a benchmark for the category, not the user's own holding.",
    argsHint:
      'categories?: string[] of AssetCategory values, default every category the user holds that has a benchmark; windowDays?: number, default 365',
    async run(args, ctx) {
      const requested = Array.isArray(args.categories)
        ? args.categories.map(asString).filter((value): value is string => value !== undefined)
        : undefined;

      // Defaulting to what the user actually holds keeps the answer about their
      // portfolio rather than about the market in general, and costs no extra
      // fetch: several categories share one benchmark series.
      const supported = new Set(ctx.market.supportedCategories());
      const held = Array.from(new Set((await ctx.assets()).map(asset => asset.category)));
      const categories = (requested ?? held).filter(category => supported.has(category));

      if (categories.length === 0) {
        return {
          trends: [],
          unavailable: (requested ?? held).map(category => ({
            category,
            reason: 'no market benchmark describes this category',
          })),
          note: 'No benchmark covers these categories. Say so rather than describing the market from memory.',
        };
      }

      const windowDays = Math.min(Math.max(asNumber(args.windowDays) ?? 365, 30), 3650);
      const { trends, unavailable } = await ctx.market.benchmarkTrends(categories, windowDays);

      return {
        trends: trends.map(entry => ({
          category: entry.category,
          benchmark: entry.benchmark,
          source: entry.source,
          currency: entry.currency,
          asOf: entry.asOf,
          latest: round(entry.trend.latest),
          windowHigh: round(entry.trend.high),
          windowHighOn: isoDate(entry.trend.highOn),
          windowLow: round(entry.trend.low),
          drawdownFromHighPercent: entry.trend.drawdownPercent,
          returnOverWindowPercent: entry.trend.returnPercent,
          windowDays: entry.trend.windowDays,
        })),
        unavailable,
        note: "These are benchmark levels for the category, not the value of the user's own holdings, and they describe the past only. Never turn one into a forecast.",
      };
    },
  },

  {
    name: 'getNewsSentiment',
    description:
      'Measured news sentiment for the categories the user holds: how many recent articles bear on each, their relevance-weighted mean sentiment and its label, how the articles split bullish/neutral/bearish, the window they cover, and the most relevant headlines with sources. Read this together with getMarketTrends — sentiment explains a price move, it does not predict the next one.',
    argsHint:
      'categories?: string[] of AssetCategory values, default every category the user holds',
    async run(args, ctx) {
      const requested = Array.isArray(args.categories)
        ? args.categories.map(asString).filter((value): value is string => value !== undefined)
        : undefined;

      const held = Array.from(new Set((await ctx.assets()).map(asset => asset.category)));
      const categories = requested ?? held;

      // An empty list would come back as an empty report with no explanation,
      // which reads as "no news" rather than "nothing was asked about".
      if (categories.length === 0) {
        return {
          categories: [],
          unavailable: [],
          note: 'There are no asset categories to look up news for — the portfolio is empty. Say so rather than describing the market from memory.',
        };
      }

      const summary = await ctx.news.summarise(categories);

      return {
        fetchedAt: summary.fetchedAt.getTime() === 0 ? undefined : isoDate(summary.fetchedAt),
        source: summary.source,
        articlesConsidered: summary.articlesConsidered,
        categories: summary.summaries.map(entry => ({
          category: entry.category,
          articleCount: entry.articleCount,
          meanSentiment: entry.meanSentiment,
          label: entry.label,
          distribution: entry.distribution,
          newestArticleAt: entry.newestAt ? isoDate(entry.newestAt) : undefined,
          oldestArticleAt: entry.oldestAt ? isoDate(entry.oldestAt) : undefined,
          isThinSample: entry.isThinSample,
          headlines: entry.topArticles.map(article => ({
            title: article.title,
            source: article.source,
            publishedAt: isoDate(article.publishedAt),
            sentimentLabel: article.sentimentLabel,
          })),
        })),
        unavailable: summary.unavailable,
        note:
          `A category with fewer than ${THIN_SAMPLE_BELOW} articles is marked isThinSample: quote its ` +
          'figure as a thin sample or not at all. Sentiment describes what has already been written, ' +
          'so never state or imply where a price will go next. Cite a headline from this list rather ' +
          'than recalling one.',
      };
    },
  },

  {
    name: 'getDecisionJournal',
    description:
      "The user's own past investment decisions: what they decided, why, the figures they were looking at, and how the benchmark has moved since — with a verdict where one can be earned. Read this before advising on a category they have decided about before, so you can say what they concluded last time and whether it worked.",
    argsHint: 'category?: string to filter by asset category; limit?: number, default 20',
    async run(args, ctx) {
      const { entries, summary } = await ctx.decisionJournal();
      const category = asString(args.category);
      const limit = Math.min(Math.max(asNumber(args.limit) ?? 20, 1), LIST_LIMIT);

      const filtered = category
        ? entries.filter(item => item.entry.category.toLowerCase() === category.toLowerCase())
        : entries;

      return {
        summary: {
          ...summary,
          // Spelled out because a bare hit rate over three decisions reads as a
          // track record.
          note:
            `hitRatePercent is over scoredCount only, not entryCount. A decision is scored only ` +
            `once it is at least ${MIN_REVIEW_DAYS} days old, made a directional claim, and the ` +
            `benchmark moved enough to call. Quote the denominator whenever you quote the rate.`,
        },
        // Newest first, as the repository returns them.
        entries: capped(
          filtered.map(item => ({
            id: item.entry.id,
            decidedOn: isoDate(item.entry.createdAt),
            category: item.entry.category,
            action: item.entry.action,
            status: item.entry.status,
            amount: round(item.entry.amount),
            currency: item.entry.currency,
            rationale: item.entry.rationale,
            evidenceAtTheTime: item.entry.evidence,
            daysSince: item.review.daysSince,
            benchmarkChangeSincePercent: item.review.benchmarkChangePercent,
            verdict: item.review.verdict,
            reviewNote: item.entry.reviewNote,
          })),
          limit
        ),
        note: "A verdict scores whether the reasoning pointed the right way, measured on the category benchmark — not what the user actually earned, which depends on what they bought and when. Never present it as a return. Entries are the user's own words; quote them rather than rewriting what they thought.",
      };
    },
  },

  {
    name: 'getExchangeRates',
    description:
      'The base currency and the configured exchange rates. Use to explain a total that excluded a currency.',
    async run(_args, ctx) {
      const rates = await ctx.rates();
      return {
        baseCurrency: ctx.converter.getBaseCurrency(),
        rates: rates.map(rate => ({
          currency: rate.code,
          unitsOfBasePerUnit: rate.getPerUnitInBase(),
          updatedAt: rate.getUpdatedAt() ? isoDate(rate.getUpdatedAt()!) : undefined,
          hasRate: rate.getPerUnitInBase() !== undefined,
        })),
      };
    },
  },
];

export const CHAT_TOOLS_BY_NAME: ReadonlyMap<string, ChatTool> = new Map(
  CHAT_TOOLS.map(tool => [tool.name, tool])
);

export const CHAT_TOOL_NAMES: ReadonlySet<string> = new Set(CHAT_TOOLS.map(tool => tool.name));
