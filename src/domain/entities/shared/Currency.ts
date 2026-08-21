/**
 * Currency is stored as an ISO 4217 code everywhere in the database.
 *
 * The set of codes is open: the user configures which currencies their data can
 * use (see `ISettings.currencies`), so this is a plain string type rather than a
 * closed enum. `Currency.INR` and friends remain available as the codes shipped
 * by default and as a sane fallback.
 *
 * Symbols and grouping come from `Intl`, which already knows every ISO code —
 * so adding a currency needs nothing but its code.
 *
 * Prior to schema v4 expenses stored the symbol ('₹') while assets, loans and
 * goals stored the code ('INR'). The v4 migration normalises expenses onto the
 * code; symbols are presentation-only.
 */
export type Currency = string;

/** The codes a fresh install starts with. */
export const Currency = {
  INR: 'INR',
  USD: 'USD',
  GBP: 'GBP',
} as const;

export const DEFAULT_CURRENCIES: Currency[] = Object.values(Currency);

/** Legacy symbol -> code, used by the v4 migration and by backup/snapshot upgrades. */
const SYMBOL_TO_CODE: Record<string, Currency> = {
  '₹': Currency.INR,
  $: Currency.USD,
  '£': Currency.GBP,
};

const ISO_CODE = /^[A-Z]{3}$/;

/** Intl.NumberFormat construction is not cheap, and these render per table row. */
const symbolCache = new Map<string, string>();

export function getCurrencySymbol(currency: string | undefined): string {
  if (!currency) return getCurrencySymbol(Currency.INR);

  const code = currency.toUpperCase();
  const cached = symbolCache.get(code);
  if (cached !== undefined) return cached;

  const symbol = readSymbol(code) ?? currency;
  symbolCache.set(code, symbol);
  return symbol;
}

/**
 * Asks Intl for the currency's narrow symbol ('₹', '$', 'CHF'), falling back to
 * the code itself for anything it does not recognise — a made-up code still has
 * to render as something.
 */
function readSymbol(code: string): string | undefined {
  try {
    const parts = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'narrowSymbol',
    }).formatToParts(0);
    return parts.find(part => part.type === 'currency')?.value;
  } catch {
    return undefined;
  }
}

/**
 * Coerces any historical representation (symbol or code, any case) to a code.
 * Unrecognised values fall back to INR.
 */
export function toCurrencyCode(value: string | undefined): Currency {
  if (!value) return Currency.INR;
  const symbolMatch = SYMBOL_TO_CODE[value];
  if (symbolMatch) return symbolMatch;
  const upper = value.toUpperCase();
  return isCurrencyCode(upper) ? upper : Currency.INR;
}

/**
 * Whether `value` is shaped like an ISO 4217 code. This deliberately does not
 * check the configured list: an amount whose currency is no longer configured
 * must still load and be reported as unconvertible, rather than failing
 * validation and blocking the edit that would fix it.
 */
export function isCurrencyCode(value: string): value is Currency {
  return ISO_CODE.test(value);
}
