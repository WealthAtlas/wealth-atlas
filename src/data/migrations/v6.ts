import { DEFAULT_CURRENCIES, isCurrencyCode } from '@/domain/entities/shared/Currency';
import { ISettings, normaliseCurrencies, SETTINGS_ID } from '@/domain/entities/shared/Settings';

/**
 * Schema v6 makes the currency list configurable: `settings.currencies` holds
 * the ISO codes this user's data may use, instead of the app shipping a fixed
 * enum of three.
 *
 * A v5 row has no `currencies`, so it is seeded with the codes that used to be
 * hardcoded — the user keeps exactly the currencies they could pick before.
 * Idempotent.
 */
export function upgradeSettingsRowToV6(row: Record<string, unknown>): void {
  const baseCurrency =
    typeof row.baseCurrency === 'string' && isCurrencyCode(row.baseCurrency)
      ? row.baseCurrency
      : DEFAULT_CURRENCIES[0];

  const existing = Array.isArray(row.currencies)
    ? (row.currencies as unknown[]).filter(
        (code): code is string => typeof code === 'string' && isCurrencyCode(code)
      )
    : DEFAULT_CURRENCIES;

  row.baseCurrency = baseCurrency;
  row.currencies = normaliseCurrencies(existing, baseCurrency);
}

/** Applies every v6 transform to a full set of table arrays, in place. */
export function upgradeSnapshotDataToV6(data: Record<string, unknown[] | undefined>): void {
  (data.settings as ISettings[] | undefined)?.forEach(row =>
    upgradeSettingsRowToV6(row as unknown as Record<string, unknown>)
  );
  // A snapshot that predates the settings table has nothing to upgrade; the v5
  // seed already supplied a row, and it carries the default currency list.
  if (!data.settings?.length) {
    data.settings = [
      { id: SETTINGS_ID, baseCurrency: DEFAULT_CURRENCIES[0], currencies: [...DEFAULT_CURRENCIES] },
    ];
  }
}
