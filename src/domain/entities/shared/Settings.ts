import { Currency, DEFAULT_CURRENCIES } from './Currency';

/**
 * App-level preferences that belong to the user's data rather than to a device,
 * so they travel through sync and backup. Device-local configuration (sync keys,
 * AI provider credentials) deliberately stays in localStorage instead — see
 * `src/data/sync/state.ts` and `src/data/llm/state.ts`.
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
}

export const SETTINGS_ID = 1;

export const DEFAULT_BASE_CURRENCY = Currency.INR;

export function defaultSettings(): ISettings {
  return {
    id: SETTINGS_ID,
    baseCurrency: DEFAULT_BASE_CURRENCY,
    currencies: [...DEFAULT_CURRENCIES],
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
