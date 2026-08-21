import { Currency, DEFAULT_CURRENCIES } from './Currency';

/**
 * App-level preferences that belong to the user's data rather than to a device,
 * so they travel through sync and backup: the base currency, the currency list
 * (rates themselves live in `currencyRates`) and the AI provider configuration.
 *
 * What stays device-local is the sync identity itself — key id, passphrase,
 * auto-sync toggle (see `src/data/sync/state.ts`). It cannot live here: it is
 * what decides *which* snapshot this device reads.
 *
 * This is a singleton row: exactly one record, always at `SETTINGS_ID`.
 */
export interface ISettings {
  id: number;
  /** The currency every cross-entity total is reported in. */
  baseCurrency: Currency;
  /**
   * The ISO codes this user's data may use — what the currency pickers offer.
   * Always contains `baseCurrency`. Codes are not restricted to a built-in list:
   * anything Intl can format works, and anything it cannot still renders as its
   * code.
   */
  currencies: Currency[];
  /** The provider AI import and the assistant talk to. */
  ai: IAiProviderSettings;
}

/**
 * The AI provider configuration, as the user typed it.
 *
 * Every field is optional and each `undefined` means "whatever the selected
 * preset says" — the preset table is transport detail, so resolution lives in
 * `src/data/llm/state.ts` rather than in the domain. Storing the raw values is
 * also what lets a preset change later ship a new default URL to a user who
 * never overrode it.
 *
 * `apiKey` travels through sync, which is end-to-end encrypted under the user's
 * passphrase, but is deliberately stripped from the plaintext backup file — see
 * `BackupService`.
 */
export interface IAiProviderSettings {
  presetId?: string;
  baseUrl?: string;
  apiKey?: string;
  model?: string;
}

export const SETTINGS_ID = 1;

export const DEFAULT_BASE_CURRENCY = Currency.INR;

export function defaultSettings(): ISettings {
  return {
    id: SETTINGS_ID,
    baseCurrency: DEFAULT_BASE_CURRENCY,
    currencies: [...DEFAULT_CURRENCIES],
    ai: {},
  };
}

/**
 * The configured list with the base currency guaranteed present and no
 * duplicates, in a stable order (base first). Dropping the base currency would
 * leave every total labelled in something the user cannot select.
 */
export function normaliseCurrencies(
  currencies: Currency[] | undefined,
  baseCurrency: Currency
): Currency[] {
  const codes = (currencies ?? []).map(code => code.toUpperCase());
  return Array.from(new Set([baseCurrency, ...codes]));
}

/**
 * Keeps only the string fields, trimmed, and drops the empty ones so an unset
 * field is always `undefined` rather than `''` — the two would otherwise mean
 * different things to preset resolution. Used on every write and by the v7
 * migration, so a row from either path has the same shape.
 */
export function normaliseAiProviderSettings(
  ai: IAiProviderSettings | undefined
): IAiProviderSettings {
  const source = (ai ?? {}) as Record<string, unknown>;
  const normalised: IAiProviderSettings = {};

  for (const field of ['presetId', 'baseUrl', 'apiKey', 'model'] as const) {
    const value = source[field];
    if (typeof value !== 'string') continue;
    const trimmed = value.trim();
    if (trimmed !== '') normalised[field] = trimmed;
  }

  return normalised;
}
