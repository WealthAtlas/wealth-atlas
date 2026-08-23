import { MemoryRepository } from '@/data/repositories/memory/MemoryRepository';
import { SettingsRepository } from '@/data/repositories/settings/SettingsRepository';
import { IMemory, Memory, MemoryKind, normaliseMemoryText } from '../entities/memory/Memory';
import { normaliseMemorySettings } from '../entities/shared/Settings';
import { MemoryOperation } from '../memory/MemoryOps';
import { validateMemory } from '../validation/EntityValidators';
import { isValid, summariseIssues } from '../validation/ValidationIssue';

/**
 * Reads and writes the assistant's memory, and owns the one preference that
 * governs it. Holding both repositories mirrors `CurrencyService`, which owns
 * the currency list on the same singleton row.
 */

/** One applied change, phrased for the line shown under the assistant's reply. */
export interface MemoryChange {
  op: 'add' | 'update' | 'delete';
  text: string;
}

export interface ApplyResult {
  changes: MemoryChange[];
  warnings: string[];
}

export class MemoryService {
  private readonly memoryRepository: MemoryRepository;
  private readonly settingsRepository: SettingsRepository;

  constructor() {
    this.memoryRepository = new MemoryRepository();
    this.settingsRepository = new SettingsRepository();
  }

  public async getMemories(): Promise<Memory[]> {
    return await this.memoryRepository.getAll();
  }

  public async isEnabled(): Promise<boolean> {
    const settings = await this.settingsRepository.get();
    return normaliseMemorySettings(settings.memory).enabled;
  }

  public async setEnabled(enabled: boolean): Promise<void> {
    const settings = await this.settingsRepository.get();
    await this.settingsRepository.save({ ...settings, memory: { enabled } });
  }

  /**
   * Adds a memory the user wrote themselves. `source` is fixed rather than a
   * parameter: anything arriving through this method came from the Settings
   * editor, and the curator's writes go through `applyOperations`.
   */
  public async createMemory(kind: MemoryKind, text: string): Promise<Memory> {
    const now = new Date();
    return await this.write(
      { id: undefined, kind, text, source: 'user', createdAt: now, updatedAt: now },
      'create'
    );
  }

  public async updateMemory(memory: IMemory): Promise<Memory> {
    return await this.write({ ...memory, source: 'user', updatedAt: new Date() }, 'update');
  }

  public async deleteMemory(id: number): Promise<void> {
    await this.memoryRepository.delete(id);
  }

  /**
   * Applies what the curator asked for.
   *
   * Every operation is validated first, through the same `validateMemory` the
   * Settings form uses — the curator's output is untrusted model text in exactly
   * the way an import plan is. A rejected operation becomes a warning and the
   * rest still apply: a background pass that threw away four good memories
   * because a fifth was malformed would be worse than one that reported it.
   *
   * `MemoryOperation` ids have already been checked against the stored set by
   * `parseMemoryOperations`, so a row can still have gone by the time we write —
   * Dexie treats that as a no-op, which is the right outcome.
   */
  public async applyOperations(operations: readonly MemoryOperation[]): Promise<ApplyResult> {
    const changes: MemoryChange[] = [];
    const warnings: string[] = [];

    if (operations.length === 0) return { changes, warnings };

    const stored = await this.getMemories();
    const byId = new Map(
      stored
        .filter((memory): memory is Memory & { id: number } => memory.id !== undefined)
        .map(memory => [memory.id, memory] as const)
    );
    /**
     * Rule 7 asks the curator to update rather than add when something already
     * covers a fact, but it cannot always tell that it is repeating itself —
     * particularly after a trim, when the phrasing it would reuse is no longer in
     * front of it. An exact repeat is cheap to catch here and would otherwise
     * show up as visible duplicate rows in Settings.
     */
    const seen = new Set(stored.map(memory => memory.text.toLowerCase()));

    for (const operation of operations) {
      try {
        if (operation.op === 'delete') {
          const existing = byId.get(operation.id);
          await this.memoryRepository.delete(operation.id);
          // Freed for reuse, so a delete-then-reword of the same statement in one
          // batch is not mistaken for a duplicate.
          if (existing) seen.delete(existing.text.toLowerCase());
          changes.push({ op: 'delete', text: existing?.text ?? `memory ${operation.id}` });
          continue;
        }

        if (operation.op === 'add') {
          const duplicate = normaliseMemoryText(operation.text).toLowerCase();
          if (seen.has(duplicate)) {
            warnings.push(`Already remembered, so not added again: "${operation.text}"`);
            continue;
          }
          seen.add(duplicate);
          const now = new Date();
          const created = await this.write(
            {
              id: undefined,
              kind: operation.kind,
              text: operation.text,
              source: 'assistant',
              createdAt: now,
              updatedAt: now,
            },
            'create'
          );
          changes.push({ op: 'add', text: created.text });
          continue;
        }

        const existing = byId.get(operation.id);
        if (!existing) {
          warnings.push(`Memory ${operation.id} was gone before it could be updated.`);
          continue;
        }
        const updated = await this.write(
          {
            ...existing,
            kind: operation.kind ?? existing.kind,
            text: operation.text ?? existing.text,
            // Left as the user's when they wrote it: an update does not make an
            // edited memory the assistant's again, and rule 10 of the curator
            // prompt leans on knowing which is which.
            source: existing.source,
            updatedAt: new Date(),
          },
          'update'
        );
        changes.push({ op: 'update', text: updated.text });
      } catch (error) {
        warnings.push(error instanceof Error ? error.message : String(error));
      }
    }

    return { changes, warnings };
  }

  /** The one write path, so nothing reaches Dexie unvalidated or untrimmed. */
  private async write(memory: IMemory, mode: 'create' | 'update'): Promise<Memory> {
    const candidate: IMemory = { ...memory, text: normaliseMemoryText(memory.text) };
    const issues = validateMemory(candidate);
    if (!isValid(issues)) {
      throw new Error(summariseIssues(issues));
    }
    return mode === 'create'
      ? await this.memoryRepository.create(candidate)
      : await this.memoryRepository.update(candidate);
  }
}
