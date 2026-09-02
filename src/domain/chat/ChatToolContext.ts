import { Asset } from '../entities/assets/Asset';
import { SIP } from '../entities/assets/SIP';
import { MonthlyExpense } from '../entities/expenses/MonthlyExpense';
import { Goal } from '../entities/goals/Goal';
import { Loan } from '../entities/loans/Loan';
import { CurrencyRate } from '../entities/shared/CurrencyRate';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { ICategoryTarget } from '../entities/shared/Settings';
import { JournalEntryWithReview } from '../services/DecisionJournalService';
import { JournalSummary } from '../journal/DecisionReview';
import { FundUniversePort, unavailableFundUniverse } from '../funds/FundUniversePort';
import { MarketDataPort, unavailableMarketData } from '../market/MarketDataPort';
import { NewsPort, unavailableNews } from '../news/NewsPort';
import { AllocationPolicyService } from '../services/AllocationPolicyService';
import { DecisionJournalService } from '../services/DecisionJournalService';
import { AssetService } from '../services/AssetService';
import { CurrencyService } from '../services/CurrencyService';
import { ExpenseService } from '../services/ExpenseService';
import { GoalService } from '../services/GoalService';
import { LoanService } from '../services/LoanService';
import { utcToday } from '../utils/DateUtils';

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
  /** The user's intended allocation. Empty means no policy has been set. */
  targetAllocation(): Promise<ICategoryTarget[]>;
  /**
   * Past decisions with their verdicts. Read-only, like every other tool: the
   * assistant may see what was decided and how it turned out, but writing an
   * entry stays a deliberate act by the user. A model that could write to the
   * journal on a misparse would corrupt the one record the reviews are scored
   * from — and an entry the user did not write is not their reasoning.
   */
  decisionJournal(): Promise<{ entries: JournalEntryWithReview[]; summary: JournalSummary }>;
  converter: CurrencyConverter;
  /** Passed in rather than read from the clock, so tools stay testable. */
  today: Date;
  runCode: CodeRunner;
  /**
   * Outside market data. Injected for the same reason `runCode` is: the real
   * implementation needs `fetch` and a cache, and no tool test should need a
   * network to run.
   */
  market: MarketDataPort;
  /** Outside news, injected for the same reason as `market`. */
  news: NewsPort;
  /**
   * Every fund on the market, not just the ones the user holds — injected for
   * the same reason as `market`. This is the only source the assistant has for
   * a fund the user does not already own; without it a suggestion could only
   * come from training memory, where the scheme may have merged or closed and
   * its performance is quoted as of a date the model cannot state.
   */
  funds: FundUniversePort;
}

export interface ChatToolServices {
  assetService: AssetService;
  expenseService: ExpenseService;
  loanService: LoanService;
  goalService: GoalService;
  currencyService: CurrencyService;
  allocationPolicyService: AllocationPolicyService;
  decisionJournalService: DecisionJournalService;
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
  market: MarketDataPort = unavailableMarketData('market data is not configured'),
  news: NewsPort = unavailableNews('no news provider is configured'),
  funds: FundUniversePort = unavailableFundUniverse('the fund list is not reachable'),
  today: Date = utcToday()
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
    targetAllocation: once(() => services.allocationPolicyService.getTargetAllocation()),
    decisionJournal: once(() => services.decisionJournalService.review(today)),
    converter,
    today,
    runCode,
    market,
    news,
    funds,
  };
}
