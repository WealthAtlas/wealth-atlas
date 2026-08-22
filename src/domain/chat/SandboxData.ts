import { computeExpenseBreakdown } from '../services/ExpenseService';
import { computeGoalProgress } from '../services/GoalService';
import { isoDate, monthKey } from '../utils/DateUtils';
import { ChatToolContext } from './ChatToolContext';

/**
 * The dataset handed to a sandboxed snippet as `data`.
 *
 * The snippet cannot reach the database — that is the point of the sandbox — so
 * everything it may compute over has to be passed in. Shapes and key names
 * match what `listAssets`, `getLoanSummary` and `getGoalProgress` already
 * return, so a model that has read a tool result can write a snippet against
 * the same fields without being taught a second vocabulary.
 *
 * Asset, loan and goal amounts are already converted to the base currency by the
 * same `CurrencyConverter` the pages use, so a snippet never has to know a rate.
 * The per-asset native figures come along too, for a question asked in the
 * asset's own currency.
 *
 * Expenses are the exception and arrive unconverted, split by the currency they
 * were paid in — the same shape the expense pages show. A snippet that wants one
 * spending figure has to pick a currency; there is no rate here to blend them
 * with, deliberately.
 */

/** Enough for arithmetic over a real portfolio; bounded so one call cannot blow the frame. */
const ROW_LIMIT = 500;

export interface SandboxDataset {
  today: string;
  baseCurrency: string;
  /** Holdings in these currencies counted as 0, exactly as elsewhere. Expenses are unaffected — they are never converted. */
  unratedCurrencies: string[];
  assets: unknown[];
  loans: unknown[];
  goals: unknown[];
  monthlyExpenses: unknown[];
  /** Set when a list was cut, so the model does not read a partial total as complete. */
  truncated: string[];
}

function round(value: number | undefined): number | undefined {
  return value === undefined ? undefined : Math.round(value * 100) / 100;
}

export async function buildSandboxData(ctx: ChatToolContext): Promise<SandboxDataset> {
  const [assets, loans, goals, monthlyExpenses] = await Promise.all([
    ctx.assets(),
    ctx.loans(),
    ctx.goals(),
    ctx.monthlyExpenses(),
  ]);

  const truncated: string[] = [];
  const cap = <T>(items: T[], name: string): T[] => {
    if (items.length > ROW_LIMIT) truncated.push(name);
    return items.slice(0, ROW_LIMIT);
  };

  return {
    today: isoDate(ctx.today),
    baseCurrency: ctx.converter.getBaseCurrency(),
    unratedCurrencies: ctx.converter.getUnratedCurrencies([
      ...assets.map(asset => asset.currency),
      ...loans.map(loan => loan.currency),
    ]),

    assets: cap(assets, 'assets').map(asset => ({
      id: asset.id,
      name: asset.name,
      category: asset.category,
      currency: asset.currency,
      valueModel: asset.valueModel,
      invested: round(asset.getTotalInvestedAmount()),
      investedInBase: round(ctx.converter.toBase(asset.getTotalInvestedAmount(), asset.currency)),
      currentValue: round(asset.getValue()),
      currentValueInBase: round(ctx.converter.toBase(asset.getValue() ?? 0, asset.currency)),
      profitLoss: round(asset.getProfitLoss()),
      irrPercentage: round(asset.getIRR()),
      quantityHeld: round(asset.getTotalQty()),
    })),

    loans: cap(loans, 'loans').map(loan => ({
      id: loan.id,
      name: loan.name,
      currency: loan.currency,
      principalAmount: loan.principalAmount,
      outstanding: round(loan.getOutstandingAmount()),
      outstandingInBase: round(ctx.converter.toBase(loan.getOutstandingAmount(), loan.currency)),
      paid: round(loan.getPaidAmount()),
      interest: round(loan.getInterestAmount()),
      irrPercentage: round(loan.getIRR()),
      isFullyPaid: loan.isFullyPaid(),
      nextPaymentDate: loan.getNextPaymentDate() ? isoDate(loan.getNextPaymentDate()!) : undefined,
      paymentsRemaining: loan.getPendingPaymentsCount(),
    })),

    goals: cap(goals, 'goals').map(goal => {
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
      };
    }),

    // Per month rather than per row: a snippet asked about spending trends wants
    // the series, and the individual rows are what `listExpenses` is for. Split
    // by currency because nothing converts an expense, so a month spent in two
    // currencies has two totals and adding them would be meaningless.
    monthlyExpenses: cap(monthlyExpenses, 'monthlyExpenses').map(month => ({
      month: monthKey(month.month),
      byCurrency: computeExpenseBreakdown([month]).map(breakdown => ({
        currency: breakdown.currency,
        total: round(breakdown.total),
        essential: round(breakdown.essentialTotal),
        nonEssential: round(breakdown.nonEssentialTotal),
        byCategory: breakdown.categories.map(category => ({
          category: category.category,
          amount: round(category.amount),
        })),
      })),
    })),

    truncated,
  };
}
