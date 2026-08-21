import { Asset } from '../entities/assets/Asset';
import { SIP } from '../entities/assets/SIP';
import { MonthlyExpense } from '../entities/expenses/MonthlyExpense';
import { Goal } from '../entities/goals/Goal';
import { Loan } from '../entities/loans/Loan';
import { CurrencyRate } from '../entities/shared/CurrencyRate';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { AssetService } from '../services/AssetService';
import { CurrencyService } from '../services/CurrencyService';
import { ExpenseService } from '../services/ExpenseService';
import { GoalService } from '../services/GoalService';
import { LoanService } from '../services/LoanService';

/**
 * What the tools read from, loaded once per question.
 *
 * The loaders are lazy and memoised because one question can trigger several
 * tool calls — a portfolio summary and an allocation breakdown both want every
 * asset, and `AssetService.getAssets()` hydrates investments and SIPs per asset.
 * Reloading for each call would multiply that fan-out for no new information;
 * within a single question the data is also expected not to change.
 */
/**
 * What a sandboxed snippet returns. A failure is data, not an exception: the
 * model is shown the reason and gets to correct itself on the next turn.
 */
export interface CodeRunResult {
  ok: boolean;
  value?: unknown;
  error?: string;
  /** Whatever the snippet logged, capped by the runner. */
  logs: string[];
}

/**
 * Runs model-authored JavaScript over a JSON dataset. Injected rather than
 * imported because the real implementation needs an iframe, which would put DOM
 * code in the domain layer and make every tool test need a browser.
 */
export type CodeRunner = (code: string, data: unknown) => Promise<CodeRunResult>;

export interface ChatToolContext {
  assets(): Promise<Asset[]>;
  loans(): Promise<Loan[]>;
  goals(): Promise<Goal[]>;
  monthlyExpenses(): Promise<MonthlyExpense[]>;
  sipsOf(assetId: number): Promise<SIP[]>;
  rates(): Promise<CurrencyRate[]>;
  converter: CurrencyConverter;
  /** Passed in rather than read from the clock, so tools stay testable. */
  today: Date;
  runCode: CodeRunner;
}

export interface ChatToolServices {
  assetService: AssetService;
  expenseService: ExpenseService;
  loanService: LoanService;
  goalService: GoalService;
  currencyService: CurrencyService;
}

/** Calls `load` at most once and hands every later caller the same promise. */
function once<T>(load: () => Promise<T>): () => Promise<T> {
  let pending: Promise<T> | undefined;
  return () => (pending ??= load());
}

export function createChatToolContext(
  services: ChatToolServices,
  converter: CurrencyConverter,
  runCode: CodeRunner,
  today: Date = new Date()
): ChatToolContext {
  const sipCache = new Map<number, Promise<SIP[]>>();

  return {
    assets: once(() => services.assetService.getAssets()),
    loans: once(() => services.loanService.getLoans()),
    goals: once(() => services.goalService.getAllGoals()),
    monthlyExpenses: once(() => services.expenseService.getMonthlyExpenses()),
    sipsOf: assetId => {
      let pending = sipCache.get(assetId);
      if (!pending) {
        pending = services.assetService.getSIPsByAssetId(assetId);
        sipCache.set(assetId, pending);
      }
      return pending;
    },
    rates: once(() => services.currencyService.getRates()),
    converter,
    today,
    runCode,
  };
}
