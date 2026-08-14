import { parse, sniffDelimiter } from './CsvParser';

/**
 * Prepares the raw file/pasted text for the model, and — more importantly —
 * builds the set of numbers that genuinely appear in the source.
 *
 * The model is asked to emit operations directly, so it is transcribing the
 * numbers itself. Every amount it returns is checked against `numericTokens`;
 * anything not found there is surfaced as `unverified` in the review screen
 * rather than being trusted.
 */

export interface NormalizedSource {
  /** Text handed to the model. */
  text: string;
  /** Canonicalised numeric literals found in the source. */
  numericTokens: Set<string>;
  rowCount: number;
  looksTabular: boolean;
}

/**
 * Canonical form for numeric comparison: drop grouping separators, currency
 * symbols and sign, collapse trailing zeros.
 *
 * "1,23,456.78" -> "123456.78"   "(500)" -> "500"   "₹1,200" -> "1200"
 * "1 234,56"    -> "1234.56"     "-42.0" -> "42"
 */
export function canonicaliseNumber(raw: string): string | undefined {
  let value = raw.trim();
  if (value === '') return undefined;

  // Strip everything that is not a digit, separator or sign.
  value = value.replace(/[^\d.,\-+']/g, '');
  if (value === '') return undefined;

  value = value.replace(/['+]/g, '').replace(/-/g, '');

  const lastComma = value.lastIndexOf(',');
  const lastDot = value.lastIndexOf('.');

  if (lastComma !== -1 && lastDot !== -1) {
    // Whichever comes last is the decimal separator.
    if (lastComma > lastDot) {
      value = value.replace(/\./g, '').replace(',', '.');
    } else {
      value = value.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    const decimals = value.length - lastComma - 1;
    // A single comma with 1-2 trailing digits is a European decimal comma;
    // anything else is thousands grouping.
    value = decimals > 0 && decimals <= 2 ? value.replace(',', '.') : value.replace(/,/g, '');
  }

  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return undefined;

  return String(Math.abs(parsed));
}

/** Canonical form of a number the model returned, for comparison. */
export function canonicaliseValue(value: number): string {
  return String(Math.abs(value));
}

/**
 * Two alternatives, in order: a space-grouped number ("1 234 567,89"), then the
 * ordinary form. The space only counts as a group separator when exactly three
 * digits follow it, so "Qty 10 Price 20" yields 10 and 20 rather than a phantom
 * "1020" — a false token would weaken provenance in the dangerous direction.
 */
const NUMBER_PATTERN = /\d{1,3}(?:[ ]\d{3})+(?:[.,]\d{1,2})?|[-+]?[\d][\d,.']*\d|\d/g;

function collectNumbers(text: string, into: Set<string>): void {
  const matches = text.match(NUMBER_PATTERN);
  if (!matches) return;

  for (const match of matches) {
    const canonical = canonicaliseNumber(match);
    if (canonical !== undefined) {
      into.add(canonical);
      // Statements routinely round in display: accept the 2dp form too, so a
      // model that writes 1234.5 against a source of 1234.50 is not flagged.
      const numeric = Number.parseFloat(canonical);
      if (Number.isFinite(numeric)) {
        into.add(String(Math.round(numeric * 100) / 100));
        into.add(String(Math.round(numeric)));
      }
    }
  }
}

export function normalizeSource(rawText: string): NormalizedSource {
  const text = rawText.replace(/\r\n/g, '\n').trim();
  const numericTokens = new Set<string>();

  const rows = parse(text, sniffDelimiter(text));
  const looksTabular = rows.length > 1 && rows[0].length > 1;

  if (looksTabular) {
    for (const row of rows) {
      for (const cell of row) {
        collectNumbers(cell, numericTokens);
      }
    }
  } else {
    collectNumbers(text, numericTokens);
  }

  return {
    text,
    numericTokens,
    rowCount: rows.length,
    looksTabular,
  };
}

/**
 * True when the model's number can be traced back to the source. Also accepts
 * the rounded forms, since a statement showing 1,234.50 may be reported as
 * 1234.5.
 */
export function isNumberInSource(value: number, numericTokens: Set<string>): boolean {
  if (!Number.isFinite(value)) return false;

  const absolute = Math.abs(value);
  const candidates = [
    String(absolute),
    String(Math.round(absolute * 100) / 100),
    String(Math.round(absolute)),
    absolute.toFixed(2),
  ];

  return candidates.some(candidate => numericTokens.has(candidate));
}

/**
 * A tradebook that lists a unit price and a quantity has no total column, so the
 * total is arithmetic and will never appear in the file. Accept it when the
 * factors do: `total / quantity` recovers the unit price for any source that
 * quotes it to the cent, which is what a statement does.
 */
export function isTotalDerivedFromSource(
  total: number,
  quantity: number | undefined,
  numericTokens: Set<string>
): boolean {
  if (quantity === undefined || !Number.isFinite(quantity) || quantity === 0) return false;
  if (!isNumberInSource(quantity, numericTokens)) return false;
  return isNumberInSource(total / quantity, numericTokens);
}
