import { Currency, getCurrencySymbol } from '../entities/shared/Currency';

/** Rupees read naturally in the Indian grouping; everything else does not. */
export function localeForCurrency(currency: Currency): string {
  return currency === Currency.INR ? 'en-IN' : 'en-US';
}

const formatterCache = new Map<Currency, Intl.NumberFormat>();

function formatterFor(currency: Currency): Intl.NumberFormat {
  const cached = formatterCache.get(currency);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(localeForCurrency(currency), {
    style: 'currency',
    currency,
    currencyDisplay: 'narrowSymbol',
    // Whole amounts read better without a trailing ".00", but a converted value
    // can land on paise, so allow two.
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
  formatterCache.set(currency, formatter);
  return formatter;
}

/**
 * The one place an amount becomes a string, so a figure in an export reads the
 * same as the page it was copied from — and, more importantly, is labelled with
 * the same currency. This used to live in `UIUtils` (app layer), which is why
 * `PortfolioExportService` could not reach it and grew its own hardcoded-rupee
 * copy instead.
 *
 * `currency` is required on purpose: an amount whose currency the caller cannot
 * name should not compile.
 *
 * Formatting comes from Intl, so a newly configured currency gets its correct
 * symbol and grouping without anything being added here.
 */
export function formatMoney(amount: number, currency: Currency): string {
  try {
    return formatterFor(currency).format(amount);
  } catch {
    // An unrecognised code still has to render as something.
    return `${getCurrencySymbol(currency)}${amount.toLocaleString(localeForCurrency(currency), {
      maximumFractionDigits: 2,
    })}`;
  }
}
