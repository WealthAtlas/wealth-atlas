import { computeAssetCategoryData, computeDashboardMetrics } from '../services/DashboardService';
import { computeExpenseBreakdown } from '../services/ExpenseService';
import { computeAllocationDrift } from '../market/AllocationDrift';
import { computeGoalProgress } from '../services/GoalService';
import { computeLoanPortfolioTotals } from '../services/LoanService';
import { addUtcMonths, isoDate } from '../utils/DateUtils';
import { computeUpcomingCommitments } from './ChatCommitments';
import { ChatToolContext } from './ChatToolContext';

/**
 * The compact picture of the portfolio sent with every question, so that
 * ordinary questions — net worth, where the money is, how spending is trending —
 * are answered without a round-trip to a tool.
 *
 * Same trade-off as `ImportContextBuilder.toPromptContext`: enough to orient the
 * model, small enough to resend each turn. Anything per-row or historical is
 * left to the tools, which is what keeps this bounded as the database grows.
 */

const SNAPSHOT_EXPENSE_MONTHS = 3;
const SNAPSHOT_TOP_CATEGORIES = 5;
const SNAPSHOT_COMMITMENT_MONTHS = 1;

export interface ChatSnapshot {
  asOf: string;
  baseCurrency: string;
  netWorth: number;
  totalAssetValue: number;
  totalInvested: number;
  totalProfitLoss: number;
  profitLossPercentage: number;
  totalLoanOutstanding: number;
  assetCount: number;
  loanCount: number;
  goalCount: number;
  allocation: { category: string; percentage: number }[];
  /**
   * One entry per currency spent in, largest first. Expenses are never
   * converted, so there is no single spending total to quote — the assistant has
   * to name the currency with the figure, and must not add two entries together.
   */
  recentSpending: {
    months: number;
    byCurrency: {
      currency: string;
      total: number;
      averagePerMonth: number;
      essentialShare: number;
      topCategories: { category: string; amount: number }[];
    }[];
  };
  goals: {
    name: string;
    maturityDate: string;
    progressPercentage: number;
    shortfall: number;
  }[];
  /**
   * Already-committed outflow over the next month. Present on every turn
   * because a model asked what to invest reasons about spare cash without
   * checking what is spoken for — and, worse, will assert there is nothing
   * committed while citing a tool it never called.
   */
  committedNextMonth: {
    sip: number;
    emi: number;
    total: number;
  };
  /**
   * How far the portfolio sits from the allocation the user intended.
   *
   * Present on every turn for the same reason `committedNextMonth` is: a model
   * asked what to buy reasons from whatever it finds most salient — a market
   * move, a recent headline — unless the gap it should actually be sizing is in
   * front of it. `isSet: false` is the important case: it means the user has
   * expressed no policy, and the assistant must ask rather than assume one.
   *
   * Only the rows outside their tolerance band are carried. Those are the
   * decisions actually open; the full table is one `getAllocationDrift` call
   * away, and listing every category here would grow the snapshot that gets
   * resent on every single turn.
   */
  allocationDrift: {
    isSet: boolean;
    outOfBand: {
      category: string;
      targetPercent: number;
      actualPercent: number;
      driftPercent: number;
      adjustmentAmount: number;
      action: string;
    }[];
  };
  /**
   * Currencies held with no rate configured. Those holdings counted as 0 in the
   * converted figures above, so the assistant must disclose this rather than
   * quote a total that is quietly short. Spending is unaffected: it is reported
   * per currency and never converted.
   */
  unratedCurrencies: string[];
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export async function buildChatSnapshot(ctx: ChatToolContext): Promise<ChatSnapshot> {
  const [assets, loans, goals, monthlyExpenses, targets] = await Promise.all([
    ctx.assets(),
    ctx.loans(),
    ctx.goals(),
    ctx.monthlyExpenses(),
    ctx.targetAllocation(),
  ]);

  const metrics = computeDashboardMetrics(assets, loans, ctx.converter);
  const loanTotals = computeLoanPortfolioTotals(loans, ctx.converter);

  const commitments = await computeUpcomingCommitments(ctx, SNAPSHOT_COMMITMENT_MONTHS);

  const drift =
    targets.length > 0 ? computeAllocationDrift(assets, targets, ctx.converter) : undefined;

  const spendingFrom = addUtcMonths(ctx.today, -SNAPSHOT_EXPENSE_MONTHS);
  const spending = computeExpenseBreakdown(monthlyExpenses, { from: spendingFrom });

  return {
    asOf: isoDate(ctx.today),
    baseCurrency: ctx.converter.getBaseCurrency(),
    netWorth: round(metrics.totalWealth),
    totalAssetValue: round(metrics.totalAssetValue),
    totalInvested: round(metrics.totalInvestedAmount),
    totalProfitLoss: round(metrics.totalProfitLoss),
    profitLossPercentage: round(metrics.profitLossPercentage),
    totalLoanOutstanding: round(loanTotals.totalOutstanding),
    assetCount: assets.length,
    loanCount: loans.length,
    goalCount: goals.length,
    allocation: computeAssetCategoryData(assets, ctx.converter).map(category => ({
      category: category.label,
      percentage: round(category.percentage),
    })),
    recentSpending: {
      months: SNAPSHOT_EXPENSE_MONTHS,
      byCurrency: spending.map(breakdown => ({
        currency: breakdown.currency,
        total: round(breakdown.total),
        averagePerMonth: round(breakdown.averageMonthlyTotal),
        essentialShare:
          breakdown.total > 0 ? round((breakdown.essentialTotal / breakdown.total) * 100) : 0,
        topCategories: breakdown.categories.slice(0, SNAPSHOT_TOP_CATEGORIES).map(category => ({
          category: category.category,
          amount: round(category.amount),
        })),
      })),
    },
    committedNextMonth: {
      sip: commitments.totalSipCommitment,
      emi: commitments.totalEmiCommitment,
      total: commitments.totalCommitment,
    },
    goals: goals.map(goal => {
      const progress = computeGoalProgress(goal, ctx.converter);
      return {
        name: goal.name,
        maturityDate: isoDate(goal.maturityDate),
        progressPercentage: round(progress.progressPercentage),
        shortfall: round(progress.shortfall),
      };
    }),
    allocationDrift: {
      isSet: drift !== undefined,
      outOfBand: (drift?.rows ?? [])
        .filter(row => row.action !== 'hold')
        .map(row => ({
          category: row.category,
          targetPercent: row.targetPercent,
          actualPercent: row.actualPercent,
          driftPercent: row.driftPercent,
          adjustmentAmount: row.adjustmentAmount,
          action: row.action,
        })),
    },
    unratedCurrencies: Array.from(new Set(metrics.unratedCurrencies)),
  };
}

export function toSnapshotPrompt(snapshot: ChatSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}
