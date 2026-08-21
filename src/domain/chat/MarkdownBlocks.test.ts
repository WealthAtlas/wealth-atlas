import { describe, expect, it } from 'vitest';
import { hasTable, MarkdownBlock, parseInline, parseMarkdownBlocks } from './MarkdownBlocks';

function kinds(blocks: MarkdownBlock[]): string[] {
  return blocks.map(block => block.kind);
}

/** Flattens a block's spans back to text, for asserting content compactly. */
function textOf(spans: { text: string }[]): string {
  return spans.map(span => span.text).join('');
}

describe('parseInline', () => {
  it('returns a single plain span for plain text', () => {
    expect(parseInline('just words')).toEqual([{ text: 'just words' }]);
  });

  it('marks **bold** and leaves the surrounding text alone', () => {
    expect(parseInline('up **12%** this year')).toEqual([
      { text: 'up ' },
      { text: '12%', bold: true },
      { text: ' this year' },
    ]);
  });

  it('marks __bold__ too', () => {
    expect(parseInline('__INR 400__')).toEqual([{ text: 'INR 400', bold: true }]);
  });

  it('marks inline code', () => {
    expect(parseInline('call `getPortfolioSummary` first')).toEqual([
      { text: 'call ' },
      { text: 'getPortfolioSummary', code: true },
      { text: ' first' },
    ]);
  });

  it('handles bold and code in one line', () => {
    expect(parseInline('**net worth** is `1240000`')).toEqual([
      { text: 'net worth', bold: true },
      { text: ' is ' },
      { text: '1240000', code: true },
    ]);
  });

  // Unbalanced markers are common in model output; the text must survive.
  it('leaves an unclosed marker as literal text', () => {
    expect(parseInline('**not closed')).toEqual([{ text: '**not closed' }]);
  });
});

describe('parseMarkdownBlocks', () => {
  it('returns nothing for empty text', () => {
    expect(parseMarkdownBlocks('')).toEqual([]);
  });

  it('reads a single paragraph', () => {
    const blocks = parseMarkdownBlocks('Your net worth is INR 12,40,000.');

    expect(kinds(blocks)).toEqual(['paragraph']);
  });

  it('joins wrapped lines into one paragraph and splits on a blank line', () => {
    const blocks = parseMarkdownBlocks('first line\nstill first\n\nsecond para');

    expect(kinds(blocks)).toEqual(['paragraph', 'paragraph']);
    expect(blocks[0].kind === 'paragraph' && textOf(blocks[0].spans)).toBe(
      'first line still first'
    );
  });

  it('reads a heading', () => {
    const blocks = parseMarkdownBlocks('## Where your money is\n\nsome prose');

    expect(kinds(blocks)).toEqual(['heading', 'paragraph']);
    expect(blocks[0].kind === 'heading' && textOf(blocks[0].spans)).toBe('Where your money is');
  });

  it('groups consecutive bullets into one list', () => {
    const blocks = parseMarkdownBlocks('- Equity 60%\n- Gold 25%\n- Cash 15%');

    expect(kinds(blocks)).toEqual(['list']);
    expect(blocks[0].kind === 'list' && blocks[0].ordered).toBe(false);
    expect(blocks[0].kind === 'list' && blocks[0].items).toHaveLength(3);
  });

  it('reads a numbered list as ordered', () => {
    const blocks = parseMarkdownBlocks('1. Pay the loan\n2. Top up the SIP');

    expect(blocks[0].kind === 'list' && blocks[0].ordered).toBe(true);
    expect(blocks[0].kind === 'list' && blocks[0].items).toHaveLength(2);
  });

  it('reads a fenced code block without treating its contents as markup', () => {
    const blocks = parseMarkdownBlocks('```\n- not a list\n**not bold**\n```');

    expect(kinds(blocks)).toEqual(['code']);
    expect(blocks[0].kind === 'code' && blocks[0].text).toBe('- not a list\n**not bold**');
  });

  describe('tables', () => {
    const TABLE = [
      '| Asset | Value | Return |',
      '| --- | ---: | ---: |',
      '| Nifty Index | 800000 | 12.4% |',
      '| Gold Bond | 200000 | 8.1% |',
    ].join('\n');

    it('reads headers and rows', () => {
      const blocks = parseMarkdownBlocks(TABLE);

      expect(kinds(blocks)).toEqual(['table']);
      if (blocks[0].kind !== 'table') throw new Error('expected a table');
      expect(blocks[0].headers.map(textOf)).toEqual(['Asset', 'Value', 'Return']);
      expect(blocks[0].rows).toHaveLength(2);
      expect(blocks[0].rows[0].map(textOf)).toEqual(['Nifty Index', '800000', '12.4%']);
    });

    it('honours an explicit right alignment marker', () => {
      const blocks = parseMarkdownBlocks(TABLE);

      expect(blocks[0].kind === 'table' && blocks[0].align).toEqual(['left', 'right', 'right']);
    });

    // Models routinely emit a bare `---` separator; money still has to line up.
    it('right-aligns an unmarked column whose cells are all numeric', () => {
      const blocks = parseMarkdownBlocks(
        ['| Category | Spent |', '| --- | --- |', '| Rent | 30,000 |', '| Food | 12,000 |'].join(
          '\n'
        )
      );

      expect(blocks[0].kind === 'table' && blocks[0].align).toEqual(['left', 'right']);
    });

    it('recognises currency and percentage cells as numeric', () => {
      const blocks = parseMarkdownBlocks(
        ['| A | B | C |', '| --- | --- | --- |', '| x | INR 1,200 | 8.1% |'].join('\n')
      );

      expect(blocks[0].kind === 'table' && blocks[0].align).toEqual(['left', 'right', 'right']);
    });

    it('leaves a text column left-aligned', () => {
      const blocks = parseMarkdownBlocks(
        ['| Name | Note |', '| --- | --- |', '| Gold | steady |'].join('\n')
      );

      expect(blocks[0].kind === 'table' && blocks[0].align).toEqual(['left', 'left']);
    });

    it('pads a short row so the grid stays rectangular', () => {
      const blocks = parseMarkdownBlocks(
        ['| A | B | C |', '| --- | --- | --- |', '| only one |'].join('\n')
      );

      expect(blocks[0].kind === 'table' && blocks[0].rows[0]).toHaveLength(3);
    });

    it('reads a table with no leading or trailing pipes', () => {
      const blocks = parseMarkdownBlocks(
        ['Asset | Value', '--- | ---', 'Gold | 200000'].join('\n')
      );

      expect(kinds(blocks)).toEqual(['table']);
    });

    // Without a separator row the pipes are not a table, and treating them as
    // one would silently swallow the first line as a header.
    it('treats pipes with no separator row as ordinary text', () => {
      const blocks = parseMarkdownBlocks('Equity | Gold | Cash are your categories');

      expect(kinds(blocks)).toEqual(['paragraph']);
    });

    it('keeps prose before and after a table', () => {
      const blocks = parseMarkdownBlocks(
        [
          'Here is the split:',
          '',
          '| A | B |',
          '| --- | --- |',
          '| 1 | 2 |',
          '',
          'Gold lags.',
        ].join('\n')
      );

      expect(kinds(blocks)).toEqual(['paragraph', 'table', 'paragraph']);
    });

    it('parses inline markup inside cells', () => {
      const blocks = parseMarkdownBlocks(
        ['| Asset | Value |', '| --- | --- |', '| **Gold** | 200000 |'].join('\n')
      );

      if (blocks[0].kind !== 'table') throw new Error('expected a table');
      expect(blocks[0].rows[0][0]).toEqual([{ text: 'Gold', bold: true }]);
    });
  });

  it('handles a mixed reply end to end', () => {
    const blocks = parseMarkdownBlocks(
      [
        '## Spending',
        '',
        'July was **higher** than June.',
        '',
        '| Category | Amount |',
        '| --- | ---: |',
        '| Travel | 88,000 |',
        '',
        '- Travel was one trip',
        '- Groceries were flat',
      ].join('\n')
    );

    expect(kinds(blocks)).toEqual(['heading', 'paragraph', 'table', 'list']);
    expect(hasTable(blocks)).toBe(true);
  });

  it('reports no table for a prose-only reply', () => {
    expect(hasTable(parseMarkdownBlocks('Just a sentence.'))).toBe(false);
  });

  it('normalises CRLF line endings', () => {
    const blocks = parseMarkdownBlocks('one\r\n\r\ntwo');

    expect(kinds(blocks)).toEqual(['paragraph', 'paragraph']);
  });
});
