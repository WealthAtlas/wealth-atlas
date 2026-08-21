/**
 * A deliberately small markdown subset, parsed into blocks the chat view renders
 * with Material-UI components.
 *
 * Written rather than installed: `react-markdown` and `marked` are both blocked
 * on this project's registry, the app keeps its dependency list minimal on
 * purpose, and a full markdown renderer would bring HTML passthrough into a
 * surface that displays model output — which is exactly where arbitrary HTML is
 * least welcome. Only these constructs are recognised; anything else stays
 * literal text.
 *
 * Supported: `##`/`###` headings, `-`/`*`/`•` and `1.` lists, GFM pipe tables,
 * fenced code, and inline `**bold**` and `` `code` ``.
 *
 * Every rule degrades to a plain paragraph rather than throwing or dropping
 * content: this parses text a language model wrote, so malformed input is
 * expected and losing a figure would be worse than showing an ugly line.
 */

export interface InlineSpan {
  text: string;
  bold?: boolean;
  code?: boolean;
  /** Set by `linkEntities` when the text names one of the user's own records. */
  link?: { kind: 'asset' | 'loan' | 'goal'; id: number };
}

export type CellAlign = 'left' | 'right';

export type MarkdownBlock =
  | { kind: 'paragraph'; spans: InlineSpan[] }
  | { kind: 'heading'; spans: InlineSpan[] }
  | { kind: 'list'; ordered: boolean; items: InlineSpan[][] }
  | { kind: 'code'; text: string }
  | {
      kind: 'table';
      headers: InlineSpan[][];
      rows: InlineSpan[][][];
      /** Per column, so money columns line up on the decimal point. */
      align: CellAlign[];
    };

const HEADING = /^\s{0,3}#{1,6}\s+(.*)$/;
const UNORDERED_ITEM = /^\s{0,3}[-*•]\s+(.*)$/;
const ORDERED_ITEM = /^\s{0,3}\d+[.)]\s+(.*)$/;
const FENCE = /^\s{0,3}```/;
/** A separator row: | --- | ---: | */
const TABLE_SEPARATOR = /^\s*\|?[\s:-]*-[\s:|-]*\|?\s*$/;

/** Splits a pipe row, dropping the leading and trailing empty cells. */
function splitRow(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return trimmed.split('|').map(cell => cell.trim());
}

/** Strict enough to start a table: a lone `a | b` sentence should not become one. */
function isTableRow(line: string): boolean {
  return line.includes('|') && splitRow(line).length > 1;
}

/**
 * Looser, for rows after the separator. Once a table has been established, a
 * pipe line belongs to it even if it is short — a reply cut off mid-row would
 * otherwise lose that row entirely rather than showing it with blanks.
 */
function continuesTable(line: string): boolean {
  return line.trim() !== '' && line.includes('|');
}

/**
 * Numbers, currency amounts and percentages — used to right-align a column the
 * model did not mark, which is most of them.
 */
function looksNumeric(text: string): boolean {
  const stripped = text.replace(/[\s,()₹$£€%+-]/g, '').replace(/^[A-Z]{3}/, '');
  return stripped.length > 0 && /^\d+(\.\d+)?$/.test(stripped);
}

export function parseInline(text: string): InlineSpan[] {
  const spans: InlineSpan[] = [];
  // Bold before code, so `**text**` and `` `code` `` can both appear in a line.
  const pattern = /(\*\*|__)(.+?)\1|`([^`]+)`/g;
  let cursor = 0;

  for (let match = pattern.exec(text); match !== null; match = pattern.exec(text)) {
    if (match.index > cursor) {
      spans.push({ text: text.slice(cursor, match.index) });
    }
    if (match[3] !== undefined) {
      spans.push({ text: match[3], code: true });
    } else {
      spans.push({ text: match[2], bold: true });
    }
    cursor = match.index + match[0].length;
  }

  if (cursor < text.length) {
    spans.push({ text: text.slice(cursor) });
  }

  return spans.length > 0 ? spans : [{ text }];
}

function alignmentsFrom(separator: string, columns: number): CellAlign[] {
  const cells = splitRow(separator);
  return Array.from({ length: columns }, (_unused, index) =>
    cells[index]?.endsWith(':') ? 'right' : 'left'
  );
}

/** Right-aligns a column the model left unmarked but whose cells are all numeric. */
function refineAlignment(align: CellAlign[], rows: string[][], separator: string): CellAlign[] {
  const marked = splitRow(separator);
  return align.map((current, index) => {
    if (current === 'right' || marked[index]?.includes(':')) return current;
    const column = rows.map(row => row[index] ?? '').filter(cell => cell !== '');
    return column.length > 0 && column.every(looksNumeric) ? 'right' : current;
  });
}

export function parseMarkdownBlocks(text: string): MarkdownBlock[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];

  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: 'paragraph', spans: parseInline(paragraph.join(' ').trim()) });
    paragraph = [];
  };

  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];

    if (line.trim() === '') {
      flushParagraph();
      continue;
    }

    if (FENCE.test(line)) {
      flushParagraph();
      const body: string[] = [];
      index++;
      while (index < lines.length && !FENCE.test(lines[index])) {
        body.push(lines[index]);
        index++;
      }
      blocks.push({ kind: 'code', text: body.join('\n') });
      continue;
    }

    const heading = HEADING.exec(line);
    if (heading) {
      flushParagraph();
      blocks.push({ kind: 'heading', spans: parseInline(heading[1].trim()) });
      continue;
    }

    // A table needs its separator row; without one the pipes are just text.
    if (
      isTableRow(line) &&
      index + 1 < lines.length &&
      TABLE_SEPARATOR.test(lines[index + 1]) &&
      isTableRow(lines[index + 1])
    ) {
      flushParagraph();
      const headerCells = splitRow(line);
      const separator = lines[index + 1];
      index += 2;

      const rawRows: string[][] = [];
      while (index < lines.length && continuesTable(lines[index])) {
        const cells = splitRow(lines[index]);
        // Pad or trim to the header width so the grid stays rectangular.
        rawRows.push(
          Array.from({ length: headerCells.length }, (_unused, column) => cells[column] ?? '')
        );
        index++;
      }
      index--;

      blocks.push({
        kind: 'table',
        headers: headerCells.map(parseInline),
        rows: rawRows.map(row => row.map(parseInline)),
        align: refineAlignment(alignmentsFrom(separator, headerCells.length), rawRows, separator),
      });
      continue;
    }

    const unordered = UNORDERED_ITEM.exec(line);
    const ordered = unordered ? null : ORDERED_ITEM.exec(line);
    if (unordered || ordered) {
      flushParagraph();
      const isOrdered = ordered !== null;
      const items: InlineSpan[][] = [];

      while (index < lines.length) {
        const candidate = isOrdered
          ? ORDERED_ITEM.exec(lines[index])
          : UNORDERED_ITEM.exec(lines[index]);
        if (!candidate) break;
        items.push(parseInline(candidate[1].trim()));
        index++;
      }
      index--;

      blocks.push({ kind: 'list', ordered: isOrdered, items });
      continue;
    }

    paragraph.push(line.trim());
  }

  flushParagraph();
  return blocks;
}

/** Whether a reply needs the extra width a table wants. */
export function hasTable(blocks: MarkdownBlock[]): boolean {
  return blocks.some(block => block.kind === 'table');
}
