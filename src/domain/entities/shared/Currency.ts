/**
 * Currency is stored as an ISO 4217 code everywhere in the database.
 *
 * Prior to schema v4 expenses stored the symbol ('₹') while assets, loans and
 * goals stored the code ('INR'). The v4 migration normalises expenses onto the
 * code; symbols are presentation-only and come from CURRENCY_SYMBOLS.
 */
export enum Currency {
  INR = 'INR',
  USD = 'USD',
  GBP = 'GBP',
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  [Currency.INR]: '₹',
  [Currency.USD]: '$',
  [Currency.GBP]: '£',
};

/** Legacy symbol -> code, used by the v4 migration and by backup/snapshot upgrades. */
const SYMBOL_TO_CODE: Record<string, Currency> = {
  '₹': Currency.INR,
  $: Currency.USD,
  '£': Currency.GBP,
};

export function getCurrencySymbol(currency: string | undefined): string {
  if (!currency) return CURRENCY_SYMBOLS[Currency.INR];
  return CURRENCY_SYMBOLS[currency as Currency] ?? currency;
}

/**
 * Coerces any historical representation (symbol or code, any case) to a Currency.
 * Unrecognised values fall back to INR.
 */
export function toCurrencyCode(value: string | undefined): Currency {
  if (!value) return Currency.INR;
  const symbolMatch = SYMBOL_TO_CODE[value];
  if (symbolMatch) return symbolMatch;
  const upper = value.toUpperCase();
  return isCurrencyCode(upper) ? upper : Currency.INR;
}

export function isCurrencyCode(value: string): value is Currency {
  return (Object.values(Currency) as string[]).includes(value);
}
