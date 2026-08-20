import { Currency, getCurrencySymbol } from '@/domain/entities/shared/Currency';

/** Rupees read naturally in the Indian grouping; everything else does not. */
function localeFor(currency: Currency): string {
  return currency === Currency.INR ? 'en-IN' : 'en-US';
}

const formatterCache = new Map<Currency, Intl.NumberFormat>();

function formatterFor(currency: Currency): Intl.NumberFormat {
  const cached = formatterCache.get(currency);
  if (cached) return cached;

  const formatter = new Intl.NumberFormat(localeFor(currency), {
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

export class UIUtils {
  static formatMonth(month: Date): string {
    return month.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  /**
   * `currency` is required on purpose. It used to be optional and defaulted to
   * the rupee symbol, which is how cross-currency totals ended up rendered as
   * INR — an amount whose currency the caller cannot name should not compile.
   *
   * Formatting comes from Intl, so a newly configured currency gets its correct
   * symbol and grouping without anything being added here.
   */
  public static formatCurrency(amount: number | undefined, currency: Currency): string {
    if (amount === undefined) return 'N/A';

    try {
      return formatterFor(currency).format(amount);
    } catch {
      // An unrecognised code still has to render as something.
      return `${getCurrencySymbol(currency)}${amount.toLocaleString(localeFor(currency), {
        maximumFractionDigits: 2,
      })}`;
    }
  }

  public static formatPercentage(percentage: number | undefined): string {
    if (percentage === undefined) return 'N/A';
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  }

  public static formatNumberInput(value: string, currency: Currency): string {
    // Remove any existing formatting and non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, '');
    const numericValue = parseFloat(cleanValue);

    if (isNaN(numericValue) || cleanValue === '') {
      return '';
    }

    return numericValue.toLocaleString(localeFor(currency));
  }

  public static parseFormattedNumber(formattedValue: string): number {
    // Remove all formatting and parse as number
    const cleanValue = formattedValue.replace(/[^\d.]/g, '');
    return parseFloat(cleanValue) || 0;
  }

  public static formatDate(date: Date): string {
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  public static formatDateForInput(date: Date | undefined): string {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  }
}
