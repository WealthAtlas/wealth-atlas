import { computeAssetCategoryData, computeDashboardMetrics } from '../services/DashboardService';
import { computeExpenseBreakdown } from '../services/ExpenseService';
import { computeGoalProgress } from '../services/GoalService';
import { computeLoanPortfolioTotals } from '../services/LoanService';
import { isoDate } from '../utils/DateUtils';
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
  const [assets, loans, goals, monthlyExpenses] = await Promise.all([
    ctx.assets(),
    ctx.loans(),
    ctx.goals(),
    ctx.monthlyExpenses(),
  ]);

  const metrics = computeDashboardMetrics(assets, loans, ctx.converter);
  const loanTotals = computeLoanPortfolioTotals(loans, ctx.converter);

  const commitments = await computeUpcomingCommitments(ctx, SNAPSHOT_COMMITMENT_MONTHS);

  const spendingFrom = new Date(ctx.today);
  spendingFrom.setMonth(spendingFrom.getMonth() - SNAPSHOT_EXPENSE_MONTHS);
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
    unratedCurrencies: Array.from(new Set(metrics.unratedCurrencies)),
  };
}

export function toSnapshotPrompt(snapshot: ChatSnapshot): string {
  return JSON.stringify(snapshot, null, 2);
}
