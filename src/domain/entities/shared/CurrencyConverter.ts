import { Currency } from './Currency';

/**
 * Translates amounts between currencies for the length of one render.
 *
 * Deliberately date-agnostic: one rate per currency, applied to every amount
 * regardless of when it was transacted. That keeps per-entity returns honest —
 * because both the invested amount and the current value of an asset convert at
 * the same rate, every ratio (profit percentage, IRR, allocation share) is
 * unchanged by the conversion. Historical figures are therefore expressed in
 * today's money, which is the intended reading.
 *
 * Pure and synchronous by design, so aggregation reducers can call it inline.
 * `CurrencyService` builds it from stored rates.
 */
export class CurrencyConverter {
  private readonly baseCurrency: Currency;
  private readonly perUnitInBase: Map<Currency, number>;

  /** `perUnitInBase`: units of base currency per one unit of the keyed currency. */
  constructor(baseCurrency: Currency, perUnitInBase: Map<Currency, number>) {
    this.baseCurrency = baseCurrency;
    this.perUnitInBase = perUnitInBase;
  }

  public getBaseCurrency(): Currency {
    return this.baseCurrency;
  }

  public hasRate(currency: Currency): boolean {
    return currency === this.baseCurrency || this.rateOf(currency) !== undefined;
  }

  /**
   * Converts between any two currencies. An unknown rate yields 0 rather than a
   * guess: a zero is visibly wrong and prompts the user to add the rate, whereas
   * falling back to 1:1 would understate a USD holding ~88-fold in a plausible
   * looking total. Callers that aggregate should report the unrated currencies
   * alongside the total — see `getUnratedCurrencies`.
   */
  public convert(amount: number, from: Currency, to: Currency): number {
    if (!Number.isFinite(amount) || amount === 0) return 0;
    if (from === to) return amount;

    const fromRate = this.rateOf(from);
    const toRate = this.rateOf(to);
    if (fromRate === undefined || toRate === undefined || toRate === 0) return 0;

    return round((amount * fromRate) / toRate);
  }

  public toBase(amount: number, from: Currency): number {
    return this.convert(amount, from, this.baseCurrency);
  }

  /** Of the currencies given, those that cannot be converted. */
  public getUnratedCurrencies(currencies: Iterable<Currency>): Currency[] {
    const unrated = new Set<Currency>();
    for (const currency of currencies) {
      if (!this.hasRate(currency)) unrated.add(currency);
    }
    return Array.from(unrated);
  }

  private rateOf(currency: Currency): number | undefined {
    if (currency === this.baseCurrency) return 1;
    const rate = this.perUnitInBase.get(currency);
    return rate !== undefined && Number.isFinite(rate) && rate > 0 ? rate : undefined;
  }
}

/** Conversion produces long tails; totals are money, so settle at 2 decimals. */
function round(value: number): number {
  return Math.round(value * 100) / 100;
}
