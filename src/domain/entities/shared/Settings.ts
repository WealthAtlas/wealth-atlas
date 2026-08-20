import { Currency } from './Currency';

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
}

export const SETTINGS_ID = 1;

export const DEFAULT_BASE_CURRENCY = Currency.INR;

export function defaultSettings(): ISettings {
  return { id: SETTINGS_ID, baseCurrency: DEFAULT_BASE_CURRENCY };
}
