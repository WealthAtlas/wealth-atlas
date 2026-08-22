import { DEFAULT_CURRENCIES } from '@/domain/entities/shared/Currency';
import {
  ISettings,
  normaliseTargetAllocation,
  SETTINGS_ID,
} from '@/domain/entities/shared/Settings';

/**
 * Schema v8 gives the settings singleton a target allocation: the share of the
 * portfolio the user intends to hold in each asset category.
 *
 * The migration only makes room for it. An upgrading row gains an empty array,
 * which is the honest starting state — no policy has been expressed yet, so
 * there is no drift to report and nothing for the assistant to measure against.
 * Seeding a plausible default (60/40, say) would be read as advice the app is
 * in no position to give, and then acted on.
 *
 * Idempotent: an existing allocation is normalised rather than replaced.
 */
export function upgradeSettingsRowToV8(row: Record<string, unknown>): void {
  row.targetAllocation = normaliseTargetAllocation(row.targetAllocation);
}

/** Applies every v8 transform to a full set of table arrays, in place. */
export function upgradeSnapshotDataToV8(data: Record<string, unknown[] | undefined>): void {
  // A snapshot with no settings row at all is seeded by the earlier steps; the
  // guard is here so this function is safe to call alone.
  if (!data.settings?.length) {
    data.settings = [
      {
        id: SETTINGS_ID,
        baseCurrency: DEFAULT_CURRENCIES[0],
        currencies: [...DEFAULT_CURRENCIES],
        ai: {},
        targetAllocation: [],
      },
    ];
    return;
  }

  (data.settings as ISettings[]).forEach(row =>
    upgradeSettingsRowToV8(row as unknown as Record<string, unknown>)
  );
}
