import { Logger } from '@/domain/utils/Logger';
import { chatJsonTurns, LlmMessage } from '@/data/llm/LlmClient';
import { getProviderHost, isLlmConfigured } from '@/data/llm/state';
import { createFundUniverse } from '@/data/funds/FundUniverse';
import { createMarketData } from '@/data/market/MarketData';
import { createNewsData } from '@/data/news/NewsData';
import { runInSandbox } from '@/data/sandbox/CodeSandbox';
import { buildChatSnapshot } from '../chat/ChatContextBuilder';
import { LinkableEntity } from '../chat/EntityLinks';
import { ChatAnswer, runChatLoop, TurnsChatFn } from '../chat/ChatLoop';
import { CodeRunner, createChatToolContext } from '../chat/ChatToolContext';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { Memory } from '../entities/memory/Memory';
import { FundUniversePort } from '../funds/FundUniversePort';
import { MarketDataPort } from '../market/MarketDataPort';
import { NewsPort } from '../news/NewsPort';
import { AllocationPolicyService } from './AllocationPolicyService';
import { curateMemories } from '../memory/MemoryCurator';
import { MemoryChange, MemoryService } from './MemoryService';
import { AssetService } from './AssetService';
import { DecisionJournalService } from './DecisionJournalService';
import { CurrencyService } from './CurrencyService';
import { ExpenseService } from './ExpenseService';
import { GoalService } from './GoalService';
import { LoanService } from './LoanService';

/**
 * Wires the domain services into a tool context, builds the snapshot, and hands
 * both to `runChatLoop`. The loop itself lives in `src/domain/chat/ChatLoop.ts`
 * so it can be driven by a scripted transport without a database.
 *
 * The conversation is held by the caller and passed in each time, so nothing is
 * persisted — a reload starts a fresh session, which is the intended behaviour
 * rather than a limitation. Deliberately no Dexie table: chat history is not
 * worth a schema version, a migration, and the snapshot and backup version
 * bumps that would have to move with it.
 */

export interface ChatDeps {
  chat?: TurnsChatFn;
  /** Overridden in tests, which have no DOM to host the sandbox iframe. */
  runCode?: CodeRunner;
  /** Overridden in tests, which must not reach the network. */
  market?: MarketDataPort;
  news?: NewsPort;
  funds?: FundUniversePort;
}

export interface AskOptions {
  signal?: AbortSignal;
  /** Fires as each tool starts, to caption the spinner with what is running. */
  onToolCall?: (name: string) => void;
}

export class ChatService {
  private readonly assetService: AssetService;
  private readonly expenseService: ExpenseService;
  private readonly loanService: LoanService;
  private readonly goalService: GoalService;
  private readonly currencyService: CurrencyService;
  private readonly memoryService: MemoryService;
  private readonly allocationPolicyService: AllocationPolicyService;
  private readonly decisionJournalService: DecisionJournalService;
  private readonly chat: TurnsChatFn;
  private readonly runCode: CodeRunner;
  private readonly market: MarketDataPort;
  private readonly news: NewsPort;
  private readonly funds: FundUniversePort;

  constructor(deps: ChatDeps = {}) {
    this.assetService = new AssetService();
    this.expenseService = new ExpenseService();
    this.loanService = new LoanService();
    this.goalService = new GoalService();
    this.currencyService = new CurrencyService();
    this.memoryService = new MemoryService();
    this.allocationPolicyService = new AllocationPolicyService();
    this.chat = deps.chat ?? chatJsonTurns;
    this.runCode = deps.runCode ?? runInSandbox;
    this.market = deps.market ?? createMarketData();
    this.news = deps.news ?? createNewsData();
    this.funds = deps.funds ?? createFundUniverse();
    // After `market`, and sharing it: the journal's verdicts are computed from
    // benchmark levels, so a test that injects a fake market must control these
    // too rather than reaching the network through the back door.
    this.decisionJournalService = new DecisionJournalService(this.market);
  }

  public isConfigured(): boolean {
    return isLlmConfigured();
  }

  /** Host shown to the user before any of their data is sent. */
  public getProviderHost(): string {
    return getProviderHost();
  }

  /**
   * Names and ids of the user's own records, so a reply that mentions one can
   * link back to it. Read here rather than in the container, which has no other
   * reason to reach for three services.
   */
  public async getLinkableEntities(): Promise<LinkableEntity[]> {
    const [assets, loans, goals] = await Promise.all([
      this.assetService.getAssets(),
      this.loanService.getLoans(),
      this.goalService.getAllGoals(),
    ]);

    return [
      ...assets.map(asset => ({ kind: 'asset' as const, id: asset.id, name: asset.name })),
      ...loans.map(loan => ({ kind: 'loan' as const, id: loan.id, name: loan.name })),
      ...goals.map(goal => ({ kind: 'goal' as const, id: goal.id, name: goal.name })),
    ].filter((entity): entity is LinkableEntity => entity.id !== undefined);
  }

  /**
   * `history` is the `transcript` from the previous answer — questions, replies
   * and the tool traffic behind them — and the next one comes back on
   * `ChatAnswer.transcript`. The snapshot is attached to the current question
   * only, so a follow-up reasons about fresh figures rather than ones that were
   * true two questions ago.
   */
  public async ask(
    history: LlmMessage[],
    question: string,
    converter: CurrencyConverter,
    options: AskOptions = {}
  ): Promise<ChatAnswer> {
    const context = createChatToolContext(
      {
        assetService: this.assetService,
        expenseService: this.expenseService,
        loanService: this.loanService,
        goalService: this.goalService,
        currencyService: this.currencyService,
        allocationPolicyService: this.allocationPolicyService,
        decisionJournalService: this.decisionJournalService,
      },
      converter,
      this.runCode,
      this.market,
      this.news,
      this.funds
    );

    const [snapshot, memories] = await Promise.all([
      buildChatSnapshot(context),
      this.readMemories(),
    ]);

    return runChatLoop({
      chat: this.chat,
      context,
      snapshot,
      history,
      question,
      memories,
      ...options,
    });
  }

  /**
   * The background pass that decides what to remember from the exchange that
   * just finished, and applies it. Returns what changed, for the line shown
   * under the reply.
   *
   * Deliberately not folded into `ask`. Awaiting a curation call before handing
   * back the answer would delay the visible reply by a whole request to write
   * something the user did not ask for; the container fires this after the reply
   * has rendered and attaches the note when it lands.
   *
   * It never throws. This runs unattended, and a curator that failed is a reason
   * to log and carry on, not to break a conversation that has already succeeded.
   */
  public async remember(
    question: string,
    reply: string,
    signal?: AbortSignal
  ): Promise<MemoryChange[]> {
    try {
      if (!isLlmConfigured()) return [];
      if (!(await this.memoryService.isEnabled())) return [];

      const memories = await this.memoryService.getMemories();
      const { operations, warnings } = await curateMemories({
        chat: this.chat,
        memories,
        question,
        reply,
        signal,
      });

      warnings.forEach(warning => Logger.warn(`Memory curation: ${warning}`));
      if (operations.length === 0) return [];

      const applied = await this.memoryService.applyOperations(operations);
      applied.warnings.forEach(warning => Logger.warn(`Memory write: ${warning}`));
      return applied.changes;
    } catch (error) {
      if (signal?.aborted) return [];
      Logger.error('Could not update the assistant’s memory', error);
      return [];
    }
  }

  /** Empty rather than throwing: a failure here must not lose the answer. */
  private async readMemories(): Promise<Memory[]> {
    try {
      if (!(await this.memoryService.isEnabled())) return [];
      return await this.memoryService.getMemories();
    } catch (error) {
      Logger.error('Could not read the assistant’s memory', error);
      return [];
    }
  }
}
