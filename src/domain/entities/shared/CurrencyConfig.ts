import { Currency, isCurrencyCode } from './Currency';
import { CurrencyRate } from './CurrencyRate';

/**
 * The currency list and the exchange rates, as one JSON document the user edits
 * directly.
 *
 * A field per currency pair does not scale: the moment the currency list is
 * configurable, the form grows a row for every code and every one of them needs
 * its own save. A single map is both smaller to maintain and easier to paste
 * from wherever the user keeps their rates.
 *
 * Shape:
 *   {
 *     "currencies": ["INR", "USD", "GBP"],
 *     "rates": {
 *       "USD": 88.42,
 *       "GBP": { "rate": 112.5, "script": "export async function getValue() {…}" }
 *     }
 *   }
 *
 * A rate is how many units of the BASE currency one unit of the keyed currency
 * is worth. The long form exists so a rate script survives a round trip through
 * the editor; the short form is what most entries look like.
 */
export interface CurrencyConfigRate {
  code: Currency;
  perUnitInBase: number | undefined;
  script: string | undefined;
}

export interface CurrencyConfig {
  currencies: Currency[];
  rates: CurrencyConfigRate[];
}

export interface CurrencyConfigParseResult {
  config?: CurrencyConfig;
  /** Human-readable problems, all of them, so one save reports every mistake. */
  issues: string[];
}

const KNOWN_KEYS = ['currencies', 'rates'];

export function serializeCurrencyConfig(
  currencies: Currency[],
  rates: CurrencyRate[],
  baseCurrency: Currency
): string {
  const rateEntries: Record<string, number | { rate?: number; script?: string }> = {};

  for (const code of currencies) {
    if (code === baseCurrency) continue;
    const rate = rates.find(candidate => candidate.code === code);
    if (!rate) continue;

    const value = rate.getPerUnitInBase();
    if (rate.script) {
      rateEntries[code] =
        value !== undefined ? { rate: value, script: rate.script } : { script: rate.script };
    } else if (value !== undefined) {
      rateEntries[code] = value;
    }
  }

  return JSON.stringify({ currencies, rates: rateEntries }, null, 2);
}

export function parseCurrencyConfig(
  text: string,
  baseCurrency: Currency
): CurrencyConfigParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    return {
      issues: [`Not valid JSON: ${error instanceof Error ? error.message : String(error)}`],
    };
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { issues: ['Expected a JSON object with "currencies" and "rates".'] };
  }

  const document = parsed as Record<string, unknown>;
  const issues: string[] = [];

  for (const key of Object.keys(document)) {
    if (!KNOWN_KEYS.includes(key)) {
      issues.push(`Unexpected key "${key}". Only ${KNOWN_KEYS.join(' and ')} are used.`);
    }
  }

  const currencies = parseCurrencies(document.currencies, baseCurrency, issues);
  const rates = parseRates(document.rates, currencies, baseCurrency, issues);

  if (issues.length > 0) return { issues };
  return { config: { currencies, rates }, issues };
}

function parseCurrencies(value: unknown, baseCurrency: Currency, issues: string[]): Currency[] {
  if (value === undefined) {
    issues.push('Missing "currencies": a list of ISO codes, such as ["INR", "USD"].');
    return [baseCurrency];
  }
  if (!Array.isArray(value)) {
    issues.push('"currencies" must be an array of ISO codes, such as ["INR", "USD"].');
    return [baseCurrency];
  }

  const codes: Currency[] = [];
  for (const entry of value) {
    if (typeof entry !== 'string' || !isCurrencyCode(entry.toUpperCase())) {
      issues.push(`"${String(entry)}" is not a three-letter ISO currency code.`);
      continue;
    }
    codes.push(entry.toUpperCase());
  }

  // The base currency is what every total is labelled in, so it is always part
  // of the list whether or not the user typed it.
  return Array.from(new Set([baseCurrency, ...codes]));
}

function parseRates(
  value: unknown,
  currencies: Currency[],
  baseCurrency: Currency,
  issues: string[]
): CurrencyConfigRate[] {
  if (value === undefined) return [];
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    issues.push('"rates" must be an object mapping each currency to its rate.');
    return [];
  }

  const rates: CurrencyConfigRate[] = [];

  for (const [rawCode, rawRate] of Object.entries(value as Record<string, unknown>)) {
    const code = rawCode.toUpperCase();

    if (!isCurrencyCode(code)) {
      issues.push(`"${rawCode}" is not a three-letter ISO currency code.`);
      continue;
    }
    if (code === baseCurrency) {
      issues.push(`${code} is the base currency, so it needs no rate. Remove it from "rates".`);
      continue;
    }
    if (!currencies.includes(code)) {
      issues.push(`${code} has a rate but is not in "currencies". Add it to the list first.`);
      continue;
    }

    const parsedRate = parseRateValue(code, rawRate, issues);
    if (parsedRate) rates.push(parsedRate);
  }

  return rates;
}

function parseRateValue(
  code: Currency,
  value: unknown,
  issues: string[]
): CurrencyConfigRate | undefined {
  if (typeof value === 'number') {
    if (!isUsableRate(value)) {
      issues.push(`${code}: the rate must be a number greater than 0.`);
      return undefined;
    }
    return { code, perUnitInBase: value, script: undefined };
  }

  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const entry = value as Record<string, unknown>;
    const rate = entry.rate;
    const script = entry.script;

    if (rate !== undefined && (typeof rate !== 'number' || !isUsableRate(rate))) {
      issues.push(`${code}: the rate must be a number greater than 0.`);
      return undefined;
    }
    if (script !== undefined && typeof script !== 'string') {
      issues.push(`${code}: "script" must be a string.`);
      return undefined;
    }
    if (rate === undefined && (script === undefined || script.trim() === '')) {
      issues.push(`${code}: give a rate, a script, or remove the entry.`);
      return undefined;
    }

    return {
      code,
      perUnitInBase: rate as number | undefined,
      script: script && script.trim() !== '' ? script : undefined,
    };
  }

  issues.push(`${code}: expected a number, or an object with "rate" and/or "script".`);
  return undefined;
}

function isUsableRate(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}
