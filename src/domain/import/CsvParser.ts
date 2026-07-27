/**
 * Small RFC4180-ish CSV reader. The app already has a hand-rolled CSV *writer*
 * in PortfolioExportService; this is the missing counterpart, and it has to
 * cope with whatever Zerodha, Coin, INDMoney and assorted US/UK brokers emit.
 *
 * Pure and dependency-free so it can be unit tested directly.
 */

const CANDIDATE_DELIMITERS = [',', ';', '\t', '|'] as const;

export type Delimiter = (typeof CANDIDATE_DELIMITERS)[number];

export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Picks the delimiter that yields the most consistent column count across the
 * first few non-empty lines. Counting raw occurrences is not enough — a
 * description field full of commas would win every time.
 */
export function sniffDelimiter(text: string): Delimiter {
  const sample = stripBom(text)
    .split(/\r?\n/)
    .filter(line => line.trim() !== '')
    .slice(0, 10);

  if (sample.length === 0) return ',';

  let best: { delimiter: Delimiter; score: number } = { delimiter: ',', score: -1 };

  for (const delimiter of CANDIDATE_DELIMITERS) {
    const counts = sample.map(line => parseRow(line, delimiter).length);
    const columns = counts[0];
    if (columns < 2) continue;

    const consistent = counts.filter(count => count === columns).length;
    // Favour consistency first, then wider tables to break ties.
    const score = consistent * 100 + columns;
    if (score > best.score) {
      best = { delimiter, score };
    }
  }

  return best.score === -1 ? ',' : best.delimiter;
}

/** Splits a single already-isolated line. Used only by the delimiter sniffer. */
function parseRow(line: string, delimiter: string): string[] {
  return parse(line, delimiter)[0] ?? [];
}

/**
 * Parses the whole document into rows of raw string cells. Handles quoted
 * fields containing the delimiter, newlines, and doubled quotes.
 */
export function parse(text: string, delimiter?: string): string[][] {
  const input = stripBom(text);
  const sep = delimiter ?? sniffDelimiter(input);

  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let fieldWasQuoted = false;

  const endField = () => {
    row.push(fieldWasQuoted ? field : field.trim());
    field = '';
    fieldWasQuoted = false;
  };

  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < input.length; i++) {
    const char = input[i];

    if (inQuotes) {
      if (char === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"' && field.trim() === '') {
      // Only treat a quote as opening if nothing meaningful precedes it in
      // this field, so `12" pipe` stays literal.
      field = '';
      inQuotes = true;
      fieldWasQuoted = true;
      continue;
    }

    if (char === sep) {
      endField();
      continue;
    }

    if (char === '\r') {
      if (input[i + 1] === '\n') i++;
      endRow();
      continue;
    }

    if (char === '\n') {
      endRow();
      continue;
    }

    field += char;
  }

  // Trailing field/row, unless the input ended exactly on a newline.
  if (field !== '' || fieldWasQuoted || row.length > 0) {
    endRow();
  }

  return rows.filter(parsed => !(parsed.length === 1 && parsed[0] === ''));
}
