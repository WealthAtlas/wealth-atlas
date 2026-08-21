import {
  ISettings,
  normaliseAiProviderSettings,
  SETTINGS_ID,
} from '@/domain/entities/shared/Settings';
import { DEFAULT_CURRENCIES } from '@/domain/entities/shared/Currency';

/**
 * Schema v7 moves the AI provider configuration into the settings singleton, so
 * every preference in Settings travels through sync and backup instead of only
 * the currency ones. It used to live in localStorage (`llm.*`).
 *
 * The migration only makes room for it: a v6 row gains an empty `ai` block. The
 * hand-off from localStorage happens in `src/data/llm/state.ts` on first load,
 * because that module is what knows those keys — and because doing it there also
 * covers a device whose IndexedDB was cleared while localStorage survived, which
 * a Dexie upgrade step would never run for.
 *
 * Idempotent.
 */
export function upgradeSettingsRowToV7(row: Record<string, unknown>): void {
  row.ai = normaliseAiProviderSettings(row.ai as ISettings['ai'] | undefined);
}

/** Applies every v7 transform to a full set of table arrays, in place. */
export function upgradeSnapshotDataToV7(data: Record<string, unknown[] | undefined>): void {
  // A snapshot old enough to have no settings row is seeded by the v5/v6 steps
  // that run before this one; the guard is here so the function is safe alone.
  if (!data.settings?.length) {
    data.settings = [
      {
        id: SETTINGS_ID,
        baseCurrency: DEFAULT_CURRENCIES[0],
        currencies: [...DEFAULT_CURRENCIES],
        ai: {},
      },
    ];
    return;
  }

  (data.settings as ISettings[]).forEach(row =>
    upgradeSettingsRowToV7(row as unknown as Record<string, unknown>)
  );
}
