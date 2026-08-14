import { describe, expect, it } from 'vitest';
import {
  canonicaliseNumber,
  isNumberInSource,
  isTotalDerivedFromSource,
  normalizeSource,
} from './SourceNormalizer';

describe('canonicaliseNumber', () => {
  it.each([
    ['1234', '1234'],
    ['1,234', '1234'],
    ['1,23,456.78', '123456.78'], // Indian grouping
    ['1,234,567.89', '1234567.89'], // Western grouping
    ['₹1,200', '1200'],
    ['$1,200.50', '1200.5'],
    ['(500)', '500'], // accounting negative
    ['-42.00', '42'],
    ['1.234,56', '1234.56'], // European decimal comma
    ['1234,56', '1234.56'],
    ['0.75', '0.75'],
  ])('canonicalises %s to %s', (input, expected) => {
    expect(canonicaliseNumber(input)).toBe(expected);
  });

  it('returns undefined for text with no digits', () => {
    expect(canonicaliseNumber('N/A')).toBeUndefined();
    expect(canonicaliseNumber('')).toBeUndefined();
    expect(canonicaliseNumber('   ')).toBeUndefined();
  });
});

describe('normalizeSource', () => {
  const CSV = [
    'symbol,trade_date,trade_type,quantity,price',
    'INFY,2024-03-15,buy,10,"1,450.75"',
    'TCS,2024-03-18,sell,5,"3,890.20"',
  ].join('\n');

  it('recognises a tabular source and counts its rows', () => {
    const result = normalizeSource(CSV);
    expect(result.looksTabular).toBe(true);
    expect(result.rowCount).toBe(3);
  });

  it('collects the numbers that appear in cells', () => {
    const { numericTokens } = normalizeSource(CSV);
    expect(numericTokens.has('1450.75')).toBe(true);
    expect(numericTokens.has('3890.2')).toBe(true);
    expect(numericTokens.has('10')).toBe(true);
    expect(numericTokens.has('5')).toBe(true);
  });

  it('handles free text that is not a table', () => {
    const result = normalizeSource('Paid 450 for groceries on 1 March');
    expect(result.looksTabular).toBe(false);
    expect(result.numericTokens.has('450')).toBe(true);
  });

  it('normalises CRLF and trims', () => {
    expect(normalizeSource('  a,b\r\n1,2  ').text).toBe('a,b\n1,2');
  });
});

describe('isNumberInSource', () => {
  const tokens = normalizeSource('amount\n"1,450.75"\n"3,890.20"\n1200').numericTokens;

  it('accepts a number transcribed exactly', () => {
    expect(isNumberInSource(1450.75, tokens)).toBe(true);
  });

  it('accepts a trailing-zero variation', () => {
    // Source shows 3,890.20; the model reports 3890.2
    expect(isNumberInSource(3890.2, tokens)).toBe(true);
  });

  it('accepts an integer written without decimals', () => {
    expect(isNumberInSource(1200, tokens)).toBe(true);
  });

  it('ignores sign, since direction comes from the operation type', () => {
    expect(isNumberInSource(-1450.75, tokens)).toBe(true);
  });

  it('rejects a number that is not in the source at all', () => {
    expect(isNumberInSource(9999.99, tokens)).toBe(false);
  });

  it('rejects a transposed digit — the case this check exists for', () => {
    expect(isNumberInSource(1540.75, tokens)).toBe(false);
  });

  it('rejects non-finite values', () => {
    expect(isNumberInSource(Number.NaN, tokens)).toBe(false);
    expect(isNumberInSource(Number.POSITIVE_INFINITY, tokens)).toBe(false);
  });
});

describe('number scanning', () => {
  it('reads a space-grouped European number as one value', () => {
    const { numericTokens } = normalizeSource('Total 1 234 567,89 EUR');

    expect(isNumberInSource(1234567.89, numericTokens)).toBe(true);
  });

  it('does not weld two separate numbers in free text into one token', () => {
    // A space only groups when three digits follow it, so this must not yield 1020 —
    // a phantom token would let a hallucinated amount pass as traced.
    const { numericTokens } = normalizeSource('Bought qty 10 at price 20 today');

    expect(isNumberInSource(10, numericTokens)).toBe(true);
    expect(isNumberInSource(20, numericTokens)).toBe(true);
    expect(isNumberInSource(1020, numericTokens)).toBe(false);
  });
});

describe('isTotalDerivedFromSource', () => {
  const { numericTokens } = normalizeSource(['symbol,qty,price', 'INFY,10,1450.75'].join('\n'));

  it('accepts a total that is the product of two numbers in the file', () => {
    expect(isTotalDerivedFromSource(14507.5, 10, numericTokens)).toBe(true);
  });

  it('rejects a total whose implied unit price is not in the file', () => {
    expect(isTotalDerivedFromSource(14000, 10, numericTokens)).toBe(false);
  });

  it('rejects it when the quantity itself is invented', () => {
    expect(isTotalDerivedFromSource(14507.5, 77, numericTokens)).toBe(false);
  });

  it('needs a quantity to divide by', () => {
    expect(isTotalDerivedFromSource(14507.5, undefined, numericTokens)).toBe(false);
    expect(isTotalDerivedFromSource(14507.5, 0, numericTokens)).toBe(false);
  });
});
