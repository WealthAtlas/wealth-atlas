import { describe, expect, it } from 'vitest';
import { LinkableEntity, linkEntities } from './EntityLinks';
import { InlineSpan, parseMarkdownBlocks } from './MarkdownBlocks';

const ENTITIES: LinkableEntity[] = [
  { kind: 'asset', id: 1, name: 'Nifty Index Fund' },
  { kind: 'asset', id: 2, name: 'Sovereign Gold Bond' },
  { kind: 'loan', id: 7, name: 'Home Loan' },
  { kind: 'goal', id: 3, name: 'Retirement' },
];

/** Every span across every block, flattened for assertions. */
function spansOf(text: string, entities: LinkableEntity[] = ENTITIES): InlineSpan[] {
  return linkEntities(parseMarkdownBlocks(text), entities).flatMap(block => {
    switch (block.kind) {
      case 'paragraph':
      case 'heading':
        return block.spans;
      case 'list':
        return block.items.flat();
      case 'table':
        return [...block.headers.flat(), ...block.rows.flat().flat()];
      case 'code':
        return [];
    }
  });
}

function linked(text: string, entities?: LinkableEntity[]) {
  return spansOf(text, entities).filter(span => span.link !== undefined);
}

describe('linkEntities', () => {
  it('links an asset named in a sentence', () => {
    const spans = linked('Nifty Index Fund is up 12%.');

    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe('Nifty Index Fund');
    expect(spans[0].link).toEqual({ kind: 'asset', id: 1 });
  });

  it('keeps the surrounding text as its own spans', () => {
    const spans = spansOf('Your Home Loan costs more.');

    expect(spans.map(span => span.text)).toEqual(['Your ', 'Home Loan', ' costs more.']);
  });

  it('links several different records in one sentence', () => {
    const spans = linked('Nifty Index Fund and Home Loan both moved.');

    expect(spans.map(span => span.link)).toEqual([
      { kind: 'asset', id: 1 },
      { kind: 'loan', id: 7 },
    ]);
  });

  it('links every occurrence of the same name', () => {
    const spans = linked('Retirement is behind. Retirement needs more.');

    expect(spans).toHaveLength(2);
  });

  it('matches case-insensitively but keeps the reply’s own casing', () => {
    const spans = linked('nifty index fund is up.');

    expect(spans[0].text).toBe('nifty index fund');
    expect(spans[0].link).toEqual({ kind: 'asset', id: 1 });
  });

  it('links a loan and a goal to their own kinds', () => {
    const spans = linked('Home Loan against Retirement.');

    expect(spans.map(span => span.link?.kind)).toEqual(['loan', 'goal']);
  });

  it('links inside list items', () => {
    const spans = linked('- Home Loan is the priority\n- Retirement lags');

    expect(spans).toHaveLength(2);
  });

  it('links inside table cells', () => {
    const spans = linked(
      ['| Asset | Value |', '| --- | ---: |', '| Nifty Index Fund | 500000 |'].join('\n')
    );

    expect(spans).toHaveLength(1);
    expect(spans[0].link).toEqual({ kind: 'asset', id: 1 });
  });

  it('preserves bold on a name that was already bold', () => {
    const spans = linked('**Nifty Index Fund** leads.');

    expect(spans[0].bold).toBe(true);
    expect(spans[0].link).toEqual({ kind: 'asset', id: 1 });
  });

  // A longer name containing a shorter one must win, or "Gold Bond" would
  // capture only part of "Sovereign Gold Bond".
  it('prefers the longest matching name', () => {
    const spans = linked('Sovereign Gold Bond held steady.', [
      { kind: 'asset', id: 2, name: 'Sovereign Gold Bond' },
      { kind: 'asset', id: 9, name: 'Gold Bond' },
    ]);

    expect(spans[0].text).toBe('Sovereign Gold Bond');
    expect(spans[0].link).toEqual({ kind: 'asset', id: 2 });
  });

  describe('not linking', () => {
    it('leaves text alone when nothing matches', () => {
      expect(linked('Your spending rose last month.')).toEqual([]);
    });

    it('does nothing with no entities', () => {
      expect(linked('Nifty Index Fund is up.', [])).toEqual([]);
    });

    // A false link is worse than a missing one: a two- or three-letter name
    // would light up ordinary prose.
    it('skips names shorter than four characters', () => {
      expect(
        linked('My FD matured and PPF grew.', [
          { kind: 'asset', id: 1, name: 'FD' },
          { kind: 'asset', id: 2, name: 'PPF' },
        ])
      ).toEqual([]);
    });

    it('requires a whole-word match', () => {
      expect(linked('Goldfinger is a film.', [{ kind: 'asset', id: 1, name: 'Gold' }])).toEqual([]);
    });

    it('does not link inside inline code', () => {
      expect(linked('call `Nifty Index Fund` verbatim')).toEqual([]);
    });

    it('does not touch fenced code blocks', () => {
      expect(linked('```\nNifty Index Fund\n```')).toEqual([]);
    });

    it('leaves table headers unlinked', () => {
      const spans = linked(['| Retirement | Value |', '| --- | --- |', '| a | 1 |'].join('\n'));

      expect(spans).toEqual([]);
    });

    it('ignores an entity whose name is blank', () => {
      expect(linked('anything at all', [{ kind: 'asset', id: 1, name: '   ' }])).toEqual([]);
    });
  });

  it('leaves block structure untouched', () => {
    const source = ['## Retirement', '', 'Home Loan first.', '', '- Nifty Index Fund'].join('\n');
    const before = parseMarkdownBlocks(source);
    const after = linkEntities(before, ENTITIES);

    expect(after.map(block => block.kind)).toEqual(before.map(block => block.kind));
  });

  it('handles a name containing regex characters', () => {
    const spans = linked('My S&P 500 (US) tracker is up.', [
      { kind: 'asset', id: 4, name: 'S&P 500 (US)' },
    ]);

    expect(spans[0].text).toBe('S&P 500 (US)');
  });
});
