import { describe, expect, it } from 'vitest';
import { collectSourceNumbers, extractReplyFigures, findUntracedFigures } from './FigureCheck';

describe('extractReplyFigures', () => {
  it('reads grouped, decimal and suffixed figures', () => {
    const figures = extractReplyFigures(
      'Net worth is INR 2,50,000, up 12.5% — about 1.2 lakh more than 3 months ago.'
    );

    expect(figures.map(figure => figure.value)).toEqual([250000, 12.5, 120000]);
  });

  it('leaves out dates, years and small counts', () => {
    const figures = extractReplyFigures(
      'Since 2024-03-01, over 2025 and 3 SIPs, you put in 45,000.'
    );

    expect(figures.map(figure => figure.text)).toEqual(['45,000']);
  });

  it('reads a figure that follows a currency code with no space', () => {
    expect(extractReplyFigures('INR250000').map(figure => figure.value)).toEqual([250000]);
  });

  it('sets the tolerance to half a unit of the last digit shown', () => {
    const [whole, oneDecimal, lakh] = extractReplyFigures('88, 12.4 and 1.2 lakh');

    expect(whole.tolerance).toBe(0.5);
    expect(oneDecimal.tolerance).toBeCloseTo(0.05);
    expect(lakh.tolerance).toBeCloseTo(5000);
  });
});

describe('collectSourceNumbers', () => {
  it('walks nested JSON and scans strings, as absolute values', () => {
    const numbers = collectSourceNumbers([
      { netWorth: 250000, rows: [{ balance: -45000 }], note: 'Target is 40% of 1,00,000' },
    ]);

    expect(numbers).toEqual(expect.arrayContaining([250000, 45000, 40, 100000]));
  });
});

describe('findUntracedFigures', () => {
  const sources = [{ netWorth: 250000, gold: 18.37, lastMonth: 42000, thisMonth: 54000 }];

  it('accepts a figure that appears in a source', () => {
    expect(findUntracedFigures('Net worth is INR 250,000.', sources)).toEqual([]);
  });

  it('accepts a source rounded the way it is displayed', () => {
    expect(findUntracedFigures('Gold is 18.4% of the portfolio, about 18%.', sources)).toEqual([]);
  });

  it('accepts a scaled figure that rounds to a source', () => {
    expect(findUntracedFigures('Net worth is 2.5 lakh.', sources)).toEqual([]);
  });

  it('accepts a difference of two sources', () => {
    expect(findUntracedFigures('You spent INR 12,000 more than last month.', sources)).toEqual([]);
  });

  it('reports a figure nothing accounts for, once', () => {
    expect(
      findUntracedFigures('Expect 14% a year, so 14% compounds to INR 9,99,999.', sources)
    ).toEqual(['14', '9,99,999']);
  });

  it('does not accept a figure outside the rounding of its source', () => {
    expect(findUntracedFigures('Gold is 18.5%.', sources)).toEqual(['18.5']);
  });
});
