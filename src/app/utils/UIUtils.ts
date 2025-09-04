export class UIUtils {
  static formatMonth(month: Date): string {
    return month.toLocaleString('default', { month: 'long', year: 'numeric' });
  }

  public static formatCurrency(amount: number | undefined, currency: string): string {
    if (amount === undefined) return 'N/A';

    const currencySymbols: Record<string, string> = {
      USD: '$',
      INR: '₹',
      GBP: '£',
    };

    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  }

  public static formatPercentage(percentage: number | undefined): string {
    if (percentage === undefined) return 'N/A';
    const sign = percentage >= 0 ? '+' : '';
    return `${sign}${percentage.toFixed(2)}%`;
  }
}
