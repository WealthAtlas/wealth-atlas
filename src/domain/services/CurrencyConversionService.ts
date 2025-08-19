import { Currency } from '../entities/shared/Currency';

// Hardcoded exchange rates (base: USD)
const EXCHANGE_RATES: Record<string, number> = {
  USD: 1.0, // Base currency
  GBP: 0.79, // 1 USD = 0.79 GBP
  INR: 83.12, // 1 USD = 83.12 INR
};

export class CurrencyConversionService {
  /**
   * Convert amount from source currency to target currency
   * @param amount Amount in source currency
   * @param fromCurrency Source currency
   * @param toCurrency Target currency
   * @returns Converted amount in target currency
   */
  static convertCurrency(amount: number, fromCurrency: string, toCurrency: string): number {
    if (fromCurrency === toCurrency) {
      return amount;
    }

    // Convert from source currency to USD first
    const amountInUSD = amount / EXCHANGE_RATES[fromCurrency];

    // Convert from USD to target currency
    return amountInUSD * EXCHANGE_RATES[toCurrency];
  }

  /**
   * Convert amount to home currency
   * @param amount Amount to convert
   * @param fromCurrency Source currency
   * @param homeCurrency Target home currency (defaults to USD for now)
   * @returns Amount converted to home currency
   */
  static convertToHomeCurrency(
    amount: number,
    fromCurrency: string,
    homeCurrency: string = Currency.USD
  ): number {
    return this.convertCurrency(amount, fromCurrency, homeCurrency);
  }

  /**
   * Get all supported currencies
   */
  static getSupportedCurrencies(): string[] {
    return Object.keys(EXCHANGE_RATES);
  }

  /**
   * Check if currency is supported
   */
  static isCurrencySupported(currency: string): boolean {
    return currency in EXCHANGE_RATES;
  }

  /**
   * Format currency amount with symbol
   */
  static formatCurrency(amount: number, currency: string): string {
    const currencySymbols: Record<string, string> = {
      USD: '$',
      GBP: '£',
      INR: '₹',
    };

    const symbol = currencySymbols[currency] || currency;
    const formatter = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });

    return `${symbol}${formatter.format(amount)}`;
  }
}
