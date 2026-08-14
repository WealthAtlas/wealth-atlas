import { withTransaction } from '@/data/database';
import { chatJson, LlmError } from '@/data/llm/LlmClient';
import { getBaseUrl, getProviderHost, isLlmConfigured, isLocalEndpoint } from '@/data/llm/state';
import { buildImportContext, ImportContext, PendingAsset } from '../import/ImportContextBuilder';
import {
  ImportOperation,
  ImportPlan,
  ImportResult,
  ValidatedOperation,
} from '../import/ImportOperation';
import { applyImportPlan } from '../import/ImportPlanExecutor';
import { validateImportPlan } from '../import/ImportPlanValidator';
import { buildSystemPrompt, buildUserPrompt } from '../import/ImportPromptBuilder';
import { normalizeSource } from '../import/SourceNormalizer';
import { Logger } from '../utils/Logger';
import { AssetService } from './AssetService';
import { ExpenseService } from './ExpenseService';
import { LoanService } from './LoanService';

/**
 * Orchestrates the AI import: read the file, show the model what already
 * exists, ask for operations, validate them, and — only after the user has
 * approved a subset — apply them in a single transaction.
 */

/**
 * How much of the file goes into one request, and how many requests we are
 * willing to make. Above the per-request budget the file is split on row
 * boundaries.
 *
 * Local runtimes need their own budget. Ollama and friends default to a small
 * `num_ctx` and TRUNCATE an oversized prompt silently rather than erroring, so
 * a cloud-sized chunk there produces a confident, partial plan — the worst
 * failure mode this feature has. Smaller chunks stay inside a modest window;
 * the higher chunk cap keeps total file capacity usable, at the cost of more
 * round-trips against a slower endpoint.
 */
export interface ChunkBudget {
  maxCharsPerRequest: number;
  maxChunks: number;
}

const CLOUD_BUDGET: ChunkBudget = { maxCharsPerRequest: 60_000, maxChunks: 8 };

/**
 * ~12k chars plus the system prompt and the asset context lands around 5k
 * tokens, which fits an 8k window and leaves room in the 32k we ask local users
 * to configure.
 */
const LOCAL_BUDGET: ChunkBudget = { maxCharsPerRequest: 12_000, maxChunks: 20 };

export function getChunkBudget(baseUrl: string): ChunkBudget {
  return isLocalEndpoint(baseUrl) ? LOCAL_BUDGET : CLOUD_BUDGET;
}

/** How many times an oversized part may be halved before giving up on it. */
const MAX_SPLIT_DEPTH = 2;

export interface ImportSource {
  text: string;
  fileName?: string;
}

/**
 * The provider transport, injected so the chunk-merging logic above it can be
 * tested without a network or a configured provider.
 */
export type ChatFn = (args: {
  system: string;
  user: string;
  signal?: AbortSignal;
}) => Promise<unknown>;

export interface DataImportDeps {
  chat?: ChatFn;
  resolveBaseUrl?: () => string;
}

/**
 * Conditions that will not change between parts: no provider configured, a key
 * the provider rejects, or a host the browser cannot reach at all. The client
 * has already retried a reachability failure, so working through the remaining
 * parts would only make the user wait longer for the same error.
 */
function isFatal(error: unknown): boolean {
  if (!(error instanceof LlmError)) return false;
  if (error.kind === 'not-configured' || error.kind === 'network') return true;
  return error.status === 401 || error.status === 403;
}

export class DataImportService {
  private readonly assetService: AssetService;
  private readonly expenseService: ExpenseService;
  private readonly loanService: LoanService;
  private readonly chat: ChatFn;
  private readonly resolveBaseUrl: () => string;

  constructor(deps: DataImportDeps = {}) {
    this.assetService = new AssetService();
    this.expenseService = new ExpenseService();
    this.loanService = new LoanService();
    this.chat = deps.chat ?? chatJson;
    this.resolveBaseUrl = deps.resolveBaseUrl ?? getBaseUrl;
  }

  public isConfigured(): boolean {
    return isLlmConfigured();
  }

  public getProviderHost(): string {
    return getProviderHost();
  }

  public async buildPlan(source: ImportSource, signal?: AbortSignal): Promise<ImportPlan> {
    const normalized = normalizeSource(source.text);
    if (normalized.text === '') {
      return { operations: [], warnings: ['The file was empty.'], sourceSummary: '' };
    }

    const context = await this.loadContext();
    const budget = getChunkBudget(this.resolveBaseUrl());
    const hasHeader = normalized.looksTabular;
    const { chunks, truncated } = splitIntoChunks(normalized.text, budget, hasHeader);

    const system = buildSystemPrompt();
    const planWarnings: string[] = [];
    const operations: ValidatedOperation[] = [];
    const summaries: string[] = [];

    // Entities an earlier part of this same file already asked to create. Shown
    // to later parts so a holding spanning two parts is created once and linked
    // twice, rather than created twice.
    const pendingAssetList: PendingAsset[] = [];
    const pendingAssets = new Map<string, string>();
    const pendingLoans = new Map<string, string>();

    if (chunks.length > 1) {
      planWarnings.push(
        `The file was large, so it was analysed in ${chunks.length} parts. Review the whole list carefully.`
      );
    }
    if (truncated) {
      planWarnings.push(
        `Only the first ${budget.maxChunks} parts were analysed — the rest of the file was not read. ` +
          'Split the file and import the remainder separately.'
      );
    }

    const queue = chunks.map((text, index) => ({ text, label: index + 1, depth: 0 }));
    let requestIndex = 0;
    let succeeded = 0;
    let firstError: unknown;

    while (queue.length > 0) {
      signal?.throwIfAborted();
      const part = queue.shift()!;
      const refPrefix = `p${requestIndex++}:`;

      let raw: unknown;
      try {
        raw = await this.chat({
          system,
          user: buildUserPrompt({
            context,
            sourceText: part.text,
            fileName: source.fileName,
            pendingAssets: pendingAssetList,
            partNumber: part.label,
            partCount: chunks.length,
            hasHeader,
          }),
          signal,
        });
      } catch (error) {
        if (signal?.aborted || isFatal(error)) throw error;
        firstError ??= error;

        // The reply hit the model's output ceiling. The input is the thing we
        // control, so halve it and try the pieces rather than losing the part.
        if (
          error instanceof LlmError &&
          error.kind === 'truncated' &&
          part.depth < MAX_SPLIT_DEPTH
        ) {
          const halves = splitInHalf(part.text, hasHeader);
          if (halves.length > 1) {
            queue.unshift(
              ...halves.map(text => ({ text, label: part.label, depth: part.depth + 1 }))
            );
            continue;
          }
        }

        Logger.warn(`Import part ${part.label} failed:`, error);
        planWarnings.push(
          `Part ${part.label} of the file could not be analysed (${error instanceof Error ? error.message : String(error)}). ` +
            'Nothing from that part is listed below.'
        );
        continue;
      }

      const partial = validateImportPlan({
        raw,
        context,
        numericTokens: normalized.numericTokens,
        refPrefix,
        pendingAssets,
        pendingLoans,
      });

      for (const item of partial.operations) {
        const operation = item.operation;
        if (operation.op === 'createAsset') {
          pendingAssets.set(operation.ref, operation.name);
          pendingAssetList.push({
            ref: operation.ref,
            name: operation.name,
            category: operation.category,
            currency: operation.currency,
          });
        }
        if (operation.op === 'createLoan') {
          pendingLoans.set(operation.ref, operation.name);
        }
      }

      operations.push(...partial.operations);
      planWarnings.push(...partial.warnings);
      if (partial.sourceSummary) summaries.push(partial.sourceSummary);
      succeeded++;
    }

    if (succeeded === 0 && firstError !== undefined) throw firstError;

    Logger.info(
      `Import plan built: ${operations.length} operations, ${planWarnings.length} warnings`
    );

    return {
      operations,
      warnings: planWarnings,
      sourceSummary: Array.from(new Set(summaries)).join(' '),
    };
  }

  /**
   * Applies the approved operations atomically. Anything that throws rolls the
   * whole batch back, so the user never ends up with a half-imported statement.
   */
  public async applyPlan(approved: ImportOperation[]): Promise<ImportResult> {
    if (approved.length === 0) {
      return { applied: 0, skipped: 0 };
    }

    const result = await withTransaction(() =>
      applyImportPlan(approved, {
        assetService: this.assetService,
        expenseService: this.expenseService,
        loanService: this.loanService,
      })
    );

    // Value scripts were skipped during the batch; refresh once now that the
    // transaction has committed.
    if (approved.some(operation => operation.op === 'createAsset')) {
      try {
        await this.assetService.updateValues();
      } catch (error) {
        Logger.warn('Post-import value refresh failed:', error);
      }
    }

    return result;
  }

  private async loadContext(): Promise<ImportContext> {
    const [assets, loans, expenses] = await Promise.all([
      this.assetService.getAssets(),
      this.loanService.getLoans(),
      this.expenseService.getExpenses(),
    ]);
    return buildImportContext(assets, loans, expenses);
  }
}

/**
 * Splits on row boundaries. For tabular input the header is repeated in each
 * chunk so every request can interpret the columns; for free text there is no
 * header, and treating the first line as one would staple an arbitrary sentence
 * to the top of every part.
 */
export function splitIntoChunks(
  text: string,
  budget: ChunkBudget,
  hasHeader = true
): { chunks: string[]; truncated: boolean } {
  if (text.length <= budget.maxCharsPerRequest) {
    return { chunks: [text], truncated: false };
  }

  const lines = text.split('\n');
  const header = hasHeader ? lines[0] : undefined;
  const body = hasHeader ? lines.slice(1) : lines;
  const chunks: string[] = [];

  const emit = (rows: string[]) =>
    chunks.push((header !== undefined ? [header, ...rows] : rows).join('\n'));

  let current: string[] = [];
  let currentLength = header?.length ?? 0;

  for (const line of body) {
    if (currentLength + line.length > budget.maxCharsPerRequest && current.length > 0) {
      emit(current);
      current = [];
      currentLength = header?.length ?? 0;
    }
    current.push(line);
    currentLength += line.length + 1;
  }

  if (current.length > 0) {
    emit(current);
  }

  const truncated = chunks.length > budget.maxChunks;
  return { chunks: truncated ? chunks.slice(0, budget.maxChunks) : chunks, truncated };
}

/**
 * Halves one part on a row boundary. Used to recover from a reply the model cut
 * off at its output limit — returns the input unchanged when there is nothing
 * left to split.
 */
export function splitInHalf(text: string, hasHeader = true): string[] {
  const lines = text.split('\n');
  const header = hasHeader ? lines[0] : undefined;
  const body = hasHeader ? lines.slice(1) : lines;
  if (body.length < 2) return [text];

  const middle = Math.ceil(body.length / 2);
  const build = (rows: string[]) => (header !== undefined ? [header, ...rows] : rows).join('\n');

  return [build(body.slice(0, middle)), build(body.slice(middle))];
}
