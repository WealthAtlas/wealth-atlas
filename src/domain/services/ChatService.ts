import { chatJsonTurns, LlmMessage } from '@/data/llm/LlmClient';
import { getProviderHost, isLlmConfigured } from '@/data/llm/state';
import { runInSandbox } from '@/data/sandbox/CodeSandbox';
import { buildChatSnapshot } from '../chat/ChatContextBuilder';
import { LinkableEntity } from '../chat/EntityLinks';
import { ChatAnswer, runChatLoop, TurnsChatFn } from '../chat/ChatLoop';
import { CodeRunner, createChatToolContext } from '../chat/ChatToolContext';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { AssetService } from './AssetService';
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
  private readonly chat: TurnsChatFn;
  private readonly runCode: CodeRunner;

  constructor(deps: ChatDeps = {}) {
    this.assetService = new AssetService();
    this.expenseService = new ExpenseService();
    this.loanService = new LoanService();
    this.goalService = new GoalService();
    this.currencyService = new CurrencyService();
    this.chat = deps.chat ?? chatJsonTurns;
    this.runCode = deps.runCode ?? runInSandbox;
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
      },
      converter,
      this.runCode
    );

    return runChatLoop({
      chat: this.chat,
      context,
      snapshot: await buildChatSnapshot(context),
      history,
      question,
      ...options,
    });
  }
}
