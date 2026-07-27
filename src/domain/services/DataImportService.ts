import { withTransaction } from '@/data/database';
import { chatJson } from '@/data/llm/LlmClient';
import { getProviderHost, isLlmConfigured } from '@/data/llm/state';
import { buildImportContext, ImportContext } from '../import/ImportContextBuilder';
import { ImportOperation, ImportPlan, ImportResult } from '../import/ImportOperation';
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

/** Above this, the file is split on row boundaries across several requests. */
const MAX_CHARS_PER_REQUEST = 60_000;
const MAX_CHUNKS = 8;

export interface ImportSource {
  text: string;
  fileName?: string;
}

export class DataImportService {
  private readonly assetService: AssetService;
  private readonly expenseService: ExpenseService;
  private readonly loanService: LoanService;

  constructor() {
    this.assetService = new AssetService();
    this.expenseService = new ExpenseService();
    this.loanService = new LoanService();
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
    const { chunks, truncated } = splitIntoChunks(normalized.text);

    const system = buildSystemPrompt();
    const planWarnings: string[] = [];
    const operations: ImportPlan['operations'] = [];
    const summaries: string[] = [];

    if (chunks.length > 1) {
      planWarnings.push(
        `The file was large, so it was analysed in ${chunks.length} parts. Review the whole list carefully.`
      );
    }
    if (truncated) {
      planWarnings.push(
        `Only the first ${MAX_CHUNKS} parts were analysed — the rest of the file was not read. ` +
          'Split the file and import the remainder separately.'
      );
    }

    for (let index = 0; index < chunks.length; index++) {
      signal?.throwIfAborted();

      const raw = await chatJson({
        system,
        user: buildUserPrompt({
          context,
          sourceText: chunks[index],
          fileName: source.fileName,
          chunkIndex: index,
          chunkCount: chunks.length,
        }),
        signal,
      });

      const partial = validateImportPlan({
        raw,
        context,
        numericTokens: normalized.numericTokens,
      });

      operations.push(...partial.operations);
      planWarnings.push(...partial.warnings);
      if (partial.sourceSummary) summaries.push(partial.sourceSummary);
    }

    Logger.info(
      `Import plan built: ${operations.length} operations, ${planWarnings.length} warnings`
    );

    return {
      operations,
      warnings: planWarnings,
      sourceSummary: summaries[0] ?? '',
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
 * Splits on row boundaries, repeating the header in each chunk so every request
 * can interpret the columns.
 */
export function splitIntoChunks(text: string): { chunks: string[]; truncated: boolean } {
  if (text.length <= MAX_CHARS_PER_REQUEST) {
    return { chunks: [text], truncated: false };
  }

  const lines = text.split('\n');
  const header = lines[0];
  const chunks: string[] = [];

  let current: string[] = [];
  let currentLength = header.length;

  for (const line of lines.slice(1)) {
    if (currentLength + line.length > MAX_CHARS_PER_REQUEST && current.length > 0) {
      chunks.push([header, ...current].join('\n'));
      current = [];
      currentLength = header.length;
    }
    current.push(line);
    currentLength += line.length + 1;
  }

  if (current.length > 0) {
    chunks.push([header, ...current].join('\n'));
  }

  const truncated = chunks.length > MAX_CHUNKS;
  return { chunks: truncated ? chunks.slice(0, MAX_CHUNKS) : chunks, truncated };
}
