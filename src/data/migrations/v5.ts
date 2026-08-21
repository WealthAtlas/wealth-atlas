import { Currency, isCurrencyCode } from '@/domain/entities/shared/Currency';
import { defaultSettings, SETTINGS_ID } from '@/domain/entities/shared/Settings';

/**
 * The settings row as v5 knew it: `currencies` arrived in v6, so a row being
 * seeded here may not have one yet.
 */
export type V5SettingsRow = { id?: number; baseCurrency?: Currency; currencies?: Currency[] };

/**
 * Schema v5 introduces base-currency reporting: a `settings` singleton holding
 * the base currency, and a `currencyRates` row per non-base currency.
 *
 * No existing row shape changes, so there is nothing to transform — the only
 * work is seeding the settings singleton. Kept here (rather than inline in the
 * Dexie upgrade) so the same seed can be applied to a restored backup or a
 * pulled snapshot that predates these tables. Idempotent.
 */

/**
 * Returns the settings rows a store should hold, given whatever it has now.
 * An existing row is left untouched; anything unusable is replaced with the
 * default so a missing base currency can never leave totals unlabelled.
 */
export function seedSettingsRows(existing: V5SettingsRow[] | undefined): V5SettingsRow[] {
  const current = existing?.find(row => row?.id === SETTINGS_ID);
  if (current && isUsableCurrency(current.baseCurrency)) return [current];
  return [defaultSettings()];
}

/** Applies every v5 transform to a full set of table arrays, in place. */
export function upgradeSnapshotDataToV5(data: Record<string, unknown[] | undefined>): void {
  data.settings = seedSettingsRows(data.settings as V5SettingsRow[] | undefined);
  data.currencyRates = data.currencyRates ?? [];
}

function isUsableCurrency(value: unknown): boolean {
  return typeof value === 'string' && isCurrencyCode(value);
}
