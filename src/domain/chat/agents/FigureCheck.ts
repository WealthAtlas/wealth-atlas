/**
 * Finds the numbers in a reply that nothing the model was shown can account
 * for — rule 1 checked by code rather than by asking the model whether it kept
 * it.
 *
 * It is a *hint* for the reviewer, never a verdict on its own. A reply may
 * legitimately state a figure no source holds verbatim — a ratio of two, a
 * month count, a sum it was right to make in runCalculation and then reword —
 * and a check strict enough to never miss an invention would flag those as well.
 * So an untraced number is passed to the LLM reviewer as "check this one", and
 * the reviewer decides. What the check buys is that an invented figure cannot go
 * unexamined because a model reviewing prose skimmed past it.
 *
 * A reply number matches a source when it is the source as it would be
 * displayed: `12.4%` for 12.3871, `1.2 lakh` for 118,950, `88` for 87.6. The
 * tolerance is half a unit of the last digit shown, scaled by any suffix, which
 * is exactly the set of values that round to what was written. A difference of
 * two sources also counts, because "INR 12,000 more than last month" is the one
 * piece of arithmetic the rules allow a model to do in its head.
 */

/** Below this a number is a count, a month or a list marker, not a figure. */
const MIN_FIGURE = 10;

/** Past this many sources the pairwise difference search is skipped. */
const MAX_SOURCES_FOR_DIFFERENCES = 600;

const SCALES: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  lakh: 1e5,
  lakhs: 1e5,
  lac: 1e5,
  l: 1e5,
  cr: 1e7,
  crore: 1e7,
  crores: 1e7,
  m: 1e6,
  mn: 1e6,
  million: 1e6,
  bn: 1e9,
  billion: 1e9,
};

export interface ReplyFigure {
  /** As written, for the reviewer to find it: "1.2 lakh", "18.5". */
  text: string;
  value: number;
  /** Half a unit of the last digit shown, in the same scale as `value`. */
  tolerance: number;
}

const DATE = /\b\d{4}-\d{2}-\d{2}\b/g;
const NUMBER =
  /(?<![\d.,])(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.(\d+))?(?:\s?(k|thousand|lakhs?|lac|l|cr|crores?|m|mn|million|bn|billion)\b)?/gi;

function isYear(integerPart: string, fraction: string | undefined, scale: string | undefined) {
  if (fraction !== undefined || scale !== undefined || integerPart.includes(',')) return false;
  const year = Number(integerPart);
  return year >= 1900 && year <= 2100;
}

/** The figures a reply states, with dates, years and small counts left out. */
export function extractReplyFigures(reply: string): ReplyFigure[] {
  const figures: ReplyFigure[] = [];
  const text = reply.replace(DATE, ' ');

  for (const match of text.matchAll(NUMBER)) {
    const [whole, integerPart, fraction, scaleWord] = match;
    if (isYear(integerPart, fraction, scaleWord)) continue;

    const scale = scaleWord ? SCALES[scaleWord.toLowerCase()] : 1;
    const shown = Number(`${integerPart.replace(/,/g, '')}${fraction ? `.${fraction}` : ''}`);
    const value = shown * scale;
    if (!Number.isFinite(value) || value < MIN_FIGURE) continue;

    const decimals = fraction?.length ?? 0;
    figures.push({ text: whole.trim(), value, tolerance: 0.5 * 10 ** -decimals * scale });
  }

  return figures;
}

/**
 * Every number anywhere in the sources, as absolute values. Walking the JSON
 * rather than regex-scanning its text keeps `1.2e5` and negative balances
 * intact; strings are scanned too, because the snapshot and the tool results
 * carry figures inside notes and the user's own messages carry them as prose.
 */
export function collectSourceNumbers(sources: readonly unknown[]): number[] {
  const found = new Set<number>();

  const visit = (value: unknown): void => {
    if (typeof value === 'number') {
      if (Number.isFinite(value)) found.add(Math.abs(value));
    } else if (typeof value === 'string') {
      for (const figure of extractReplyFigures(value)) found.add(figure.value);
    } else if (Array.isArray(value)) {
      value.forEach(visit);
    } else if (typeof value === 'object' && value !== null) {
      Object.values(value).forEach(visit);
    }
  };

  sources.forEach(visit);
  return Array.from(found).filter(value => value >= MIN_FIGURE);
}

function matches(figure: ReplyFigure, value: number): boolean {
  return Math.abs(figure.value - value) <= figure.tolerance;
}

/**
 * The reply's figures that no source, and no difference of two sources,
 * accounts for. Each is reported once, in the order it first appears.
 */
export function findUntracedFigures(reply: string, sources: readonly unknown[]): string[] {
  const numbers = collectSourceNumbers(sources);
  const tryDifferences = numbers.length <= MAX_SOURCES_FOR_DIFFERENCES;
  const untraced: string[] = [];

  for (const figure of extractReplyFigures(reply)) {
    if (untraced.includes(figure.text)) continue;
    if (numbers.some(value => matches(figure, value))) continue;

    const byDifference =
      tryDifferences && numbers.some(a => numbers.some(b => a > b && matches(figure, a - b)));
    if (byDifference) continue;

    untraced.push(figure.text);
  }

  return untraced;
}
