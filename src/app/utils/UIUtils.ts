import { Currency } from '@/domain/entities/shared/Currency';
import { formatMoney, localeForCurrency } from '@/domain/utils/MoneyFormat';

export class UIUtils {
  static formatMonth(month: Date): string {
    return month.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  }

  /**
   * `currency` is required on purpose. It used to be optional and defaulted to
   * the rupee symbol, which is how cross-currency totals ended up rendered as
   * INR — an amount whose currency the caller cannot name should not compile.
   *
   * The formatting itself lives in `domain/utils/MoneyFormat` so the exports can
   * share it; this adds only the `undefined` handling the UI needs.
   */
  public static formatCurrency(amount: number | undefined, currency: Currency): string {
    if (amount === undefined) return 'N/A';
    return formatMoney(amount, currency);
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

    return numericValue.toLocaleString(localeForCurrency(currency));
  }

  public static parseFormattedNumber(formattedValue: string): number {
    // Remove all formatting and parse as number
    const cleanValue = formattedValue.replace(/[^\d.]/g, '');
    return parseFloat(cleanValue) || 0;
  }

  /**
   * Renders a calendar date. Pinned to UTC, and that is the whole point: the
   * stored value is UTC midnight, so formatting it in the browser's zone shows
   * the *previous* day anywhere behind UTC — a user in New York enters 1 Jan and
   * the card reads 31 Dec. `timeZone: 'UTC'` is what makes the date read back as
   * the one that was typed, on every device.
   *
   * This is only for the date-only fields. A machine timestamp — `updatedAt`, a
   * value-refresh stamp, a recovery copy's `takenAt` — is a real instant and is
   * still shown in local time, because for those the time of day is the content.
   */
  public static formatDate(date: Date): string {
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    });
  }

  /** A calendar date in the browser's own short format, still read as UTC. */
  public static formatDateShort(date: Date): string {
    return date.toLocaleDateString(undefined, { timeZone: 'UTC' });
  }

  public static formatDateForInput(date: Date | undefined): string {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  }
}
