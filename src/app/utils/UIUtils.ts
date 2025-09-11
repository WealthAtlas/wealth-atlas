export class UIUtils {
  static formatMonth(month: Date): string {
    return month.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  public static formatCurrency(amount: number | undefined, currency?: string): string {
    if (amount === undefined) return 'N/A';

    const currencySymbols: Record<string, string> = {
      USD: '$',
      INR: '₹',
      GBP: '£',
    };

    const symbol = currencySymbols[currency ?? 'INR'] || currency;

    // Format in Indian numbering system for INR, otherwise use standard formatting
    return `${symbol}${amount.toLocaleString('en-IN')}`;
  }

  public static formatPercentage(percentage: number | undefined): string {
    if (percentage === undefined) return 'N/A';
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  }

  public static formatNumberInput(value: string, currency: string): string {
    // Remove any existing formatting and non-numeric characters except decimal point
    const cleanValue = value.replace(/[^\d.]/g, '');
    const numericValue = parseFloat(cleanValue);

    if (isNaN(numericValue) || cleanValue === '') {
      return '';
    }

    // Format based on currency
    if (currency === 'INR') {
      return numericValue.toLocaleString('en-IN');
    } else {
      return numericValue.toLocaleString();
    }
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
