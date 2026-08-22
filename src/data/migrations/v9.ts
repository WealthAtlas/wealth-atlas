import { DEFAULT_CURRENCIES } from '@/domain/entities/shared/Currency';
import {
  ISettings,
  normaliseNewsProviderSettings,
  SETTINGS_ID,
} from '@/domain/entities/shared/Settings';

/**
 * Schema v9 gives the settings singleton a news provider block, so the
 * assistant can read market sentiment from a real feed rather than from the
 * model's memory of one.
 *
 * An upgrading row gains an empty block, which means "no news configured" — the
 * assistant then says so rather than describing the market from memory. Only a
 * key lives here; the endpoint and the topic set are not the user's choice,
 * because the topics have to match what the aggregation code can partition.
 *
 * Idempotent.
 */
export function upgradeSettingsRowToV9(row: Record<string, unknown>): void {
  row.news = normaliseNewsProviderSettings(row.news as ISettings['news'] | undefined);
}

/** Applies every v9 transform to a full set of table arrays, in place. */
export function upgradeSnapshotDataToV9(data: Record<string, unknown[] | undefined>): void {
  // A snapshot with no settings row is seeded by the earlier steps; the guard is
  // here so this function is safe to call alone.
  if (!data.settings?.length) {
    data.settings = [
      {
        id: SETTINGS_ID,
        baseCurrency: DEFAULT_CURRENCIES[0],
        currencies: [...DEFAULT_CURRENCIES],
        ai: {},
        news: {},
        targetAllocation: [],
      },
    ];
    return;
  }

  (data.settings as ISettings[]).forEach(row =>
    upgradeSettingsRowToV9(row as unknown as Record<string, unknown>)
  );
}
