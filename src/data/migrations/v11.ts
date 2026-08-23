import { ISettings, normaliseMemorySettings, SETTINGS_ID } from '@/domain/entities/shared/Settings';
import { normaliseMemoryText } from '@/domain/entities/memory/Memory';
import { DEFAULT_CURRENCIES } from '@/domain/entities/shared/Currency';

/**
 * Schema v11 adds the `memories` table — what the assistant remembers about the
 * user between conversations — and the switch that governs it.
 *
 * Two halves, which is why both functions are here. Dexie creates the store from
 * the `version(11).stores()` declaration, so an upgrading device simply gains an
 * empty memory; the row transform exists only for the settings singleton, which
 * needs the new `memory` block. The snapshot side matters more: a snapshot
 * written before v11 has no `memories` key at all, and `bulkPut(undefined)` is
 * not `bulkPut([])`.
 *
 * Both idempotent.
 */

export function upgradeSettingsRowToV11(row: Record<string, unknown>): void {
  row.memory = normaliseMemorySettings(row.memory as ISettings['memory'] | undefined);
}

/**
 * A memory row only ever arrives from this app's own writer, so there is no
 * legacy shape to convert. The guard is against text that lost its shape in
 * transit: the memory block is rendered one statement per line into the system
 * prompt, so an embedded newline would split one memory into two apparent
 * entries.
 */
export function normaliseMemoryRow(row: Record<string, unknown>): void {
  if (typeof row.text === 'string') row.text = normaliseMemoryText(row.text);
  if (row.source !== 'user' && row.source !== 'assistant') row.source = 'assistant';
}

export function upgradeSnapshotDataToV11(data: Record<string, unknown[] | undefined>): void {
  data.memories ??= [];
  (data.memories as Record<string, unknown>[]).forEach(normaliseMemoryRow);

  if (!data.settings?.length) {
    data.settings = [
      {
        id: SETTINGS_ID,
        baseCurrency: DEFAULT_CURRENCIES[0],
        currencies: [...DEFAULT_CURRENCIES],
        ai: {},
        news: {},
        memory: { enabled: true },
        targetAllocation: [],
      },
    ];
    return;
  }

  (data.settings as ISettings[]).forEach(row =>
    upgradeSettingsRowToV11(row as unknown as Record<string, unknown>)
  );
}
