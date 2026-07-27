import { describe, expect, it } from 'vitest';
import { parse, sniffDelimiter, stripBom } from './CsvParser';

describe('stripBom', () => {
  it('removes a leading byte-order mark', () => {
    expect(stripBom('﻿Symbol,Qty')).toBe('Symbol,Qty');
  });

  it('leaves clean text alone', () => {
    expect(stripBom('Symbol,Qty')).toBe('Symbol,Qty');
  });
});

describe('sniffDelimiter', () => {
  it('detects commas', () => {
    expect(sniffDelimiter('a,b,c\n1,2,3')).toBe(',');
  });

  it('detects semicolons', () => {
    expect(sniffDelimiter('a;b;c\n1;2;3')).toBe(';');
  });

  it('detects tabs', () => {
    expect(sniffDelimiter('a\tb\tc\n1\t2\t3')).toBe('\t');
  });

  it('detects pipes', () => {
    expect(sniffDelimiter('a|b|c\n1|2|3')).toBe('|');
  });

  it('prefers the delimiter giving a consistent column count', () => {
    // Commas appear inside a quoted description but semicolon is the real one.
    const text = 'name;amount\n"Coffee, milk";120\n"Tea, spice";80';
    expect(sniffDelimiter(text)).toBe(';');
  });

  it('falls back to comma on a single-column file', () => {
    expect(sniffDelimiter('justonecolumn\nvalue')).toBe(',');
  });

  it('falls back to comma on empty input', () => {
    expect(sniffDelimiter('')).toBe(',');
  });
});

describe('parse', () => {
  it('parses a simple table', () => {
    expect(parse('Symbol,Qty\nINFY,10')).toEqual([
      ['Symbol', 'Qty'],
      ['INFY', '10'],
    ]);
  });

  it('trims unquoted cells but preserves quoted ones', () => {
    expect(parse('a , b\n" padded ", x')).toEqual([
      ['a', 'b'],
      [' padded ', 'x'],
    ]);
  });

  it('keeps a delimiter inside a quoted field', () => {
    expect(parse('desc,amount\n"Groceries, weekly",450')).toEqual([
      ['desc', 'amount'],
      ['Groceries, weekly', '450'],
    ]);
  });

  it('keeps a newline inside a quoted field', () => {
    expect(parse('desc,amount\n"line one\nline two",10')).toEqual([
      ['desc', 'amount'],
      ['line one\nline two', '10'],
    ]);
  });

  it('unescapes doubled quotes', () => {
    expect(parse('a\n"He said ""hi"""')).toEqual([['a'], ['He said "hi"']]);
  });

  it('handles CRLF line endings', () => {
    expect(parse('a,b\r\n1,2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('strips a BOM before parsing', () => {
    expect(parse('﻿a,b\n1,2')[0]).toEqual(['a', 'b']);
  });

  it('preserves an empty trailing cell', () => {
    expect(parse('a,b,c\n1,,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '', '3'],
    ]);
  });

  it('drops blank lines rather than emitting empty rows', () => {
    expect(parse('a,b\n\n1,2\n\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });

  it('tolerates ragged rows', () => {
    expect(parse('a,b,c\n1,2')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2'],
    ]);
  });

  it('does not treat a mid-field quote as a quoted field', () => {
    expect(parse('size\n12" pipe')).toEqual([['size'], ['12" pipe']]);
  });

  it('parses a realistic Zerodha-style tradebook row', () => {
    const csv = [
      'symbol,isin,trade_date,exchange,segment,trade_type,quantity,price',
      'INFY,INE009A01021,2024-03-15,NSE,EQ,buy,10,1450.75',
      'TCS,INE467B01029,2024-03-18,NSE,EQ,sell,5,3890.20',
    ].join('\n');

    const rows = parse(csv);
    expect(rows).toHaveLength(3);
    expect(rows[1]).toEqual([
      'INFY',
      'INE009A01021',
      '2024-03-15',
      'NSE',
      'EQ',
      'buy',
      '10',
      '1450.75',
    ]);
    expect(rows[2][5]).toBe('sell');
  });
});
