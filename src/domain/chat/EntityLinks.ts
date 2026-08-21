import { InlineSpan, MarkdownBlock } from './MarkdownBlocks';

/**
 * Turns names of the user's own assets, loans and goals into tappable spans, so
 * a figure in an answer leads back to the data behind it.
 *
 * Detected here rather than asked of the model: emitting link syntax correctly,
 * every time, with the right id, is exactly the kind of instruction a smaller
 * local model drops — and a missed link is invisible, so the failure would go
 * unnoticed. The app already knows every name and id, so matching is
 * deterministic and needs nothing of the prompt.
 *
 * Matching is conservative, because a false link is worse than a missing one:
 * whole words only, case-insensitive, longest name first so "Gold Bond II" wins
 * over "Gold Bond", and short names are skipped entirely — an asset called
 * "Cash" or "PPF" would otherwise light up ordinary prose.
 */

export type LinkableKind = 'asset' | 'loan' | 'goal';

export interface LinkTarget {
  kind: LinkableKind;
  id: number;
}

export interface LinkableEntity extends LinkTarget {
  name: string;
}

/**
 * Below this, a name is too likely to collide with an ordinary word. Four
 * characters still admits real names like "Gold" while rejecting "FD" and "PPF".
 */
const MIN_NAME_LENGTH = 4;

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * A whole-word matcher for one name.
 *
 * `\b` is only asserted at an end that actually starts or finishes with a word
 * character: an asset called "S&P 500 (US)" ends in a bracket, and `\b` after a
 * non-word character would demand a word character next, so the name would
 * never match at all.
 */
function wholeWordPattern(name: string): RegExp {
  const start = /^\w/.test(name) ? '\\b' : '';
  const end = /\w$/.test(name) ? '\\b' : '';
  return new RegExp(`${start}${escapeRegExp(name)}${end}`, 'i');
}

/** Longest first, so a name that contains another is matched before it. */
function byLengthDescending(entities: LinkableEntity[]): LinkableEntity[] {
  return [...entities]
    .filter(entity => entity.name.trim().length >= MIN_NAME_LENGTH)
    .sort((a, b) => b.name.trim().length - a.name.trim().length);
}

/**
 * Splits one span's text on any entity name it contains. Already-styled spans
 * keep their bold/code marks, so a bolded asset name stays bold and becomes a
 * link.
 */
function linkSpan(span: InlineSpan, entities: LinkableEntity[]): InlineSpan[] {
  // Code is quoted verbatim — a tool name that happens to match an asset should
  // not turn into a link.
  if (span.code || span.link) return [span];

  for (const entity of entities) {
    const match = wholeWordPattern(entity.name.trim()).exec(span.text);
    if (!match) continue;

    const before = span.text.slice(0, match.index);
    const matched = span.text.slice(match.index, match.index + match[0].length);
    const after = span.text.slice(match.index + match[0].length);

    return [
      // Recurse either side, so several names in one sentence all link.
      ...(before ? linkSpan({ ...span, text: before }, entities) : []),
      { ...span, text: matched, link: { kind: entity.kind, id: entity.id } },
      ...(after ? linkSpan({ ...span, text: after }, entities) : []),
    ];
  }

  return [span];
}

function linkSpans(spans: InlineSpan[], entities: LinkableEntity[]): InlineSpan[] {
  return spans.flatMap(span => linkSpan(span, entities));
}

/** Adds link targets to every span in every block, leaving structure untouched. */
export function linkEntities(blocks: MarkdownBlock[], entities: LinkableEntity[]): MarkdownBlock[] {
  const ordered = byLengthDescending(entities);
  if (ordered.length === 0) return blocks;

  return blocks.map(block => {
    switch (block.kind) {
      case 'paragraph':
      case 'heading':
        return { ...block, spans: linkSpans(block.spans, ordered) };
      case 'list':
        return { ...block, items: block.items.map(item => linkSpans(item, ordered)) };
      case 'table':
        return {
          ...block,
          // Headers are column titles, not entity references.
          rows: block.rows.map(row => row.map(cell => linkSpans(cell, ordered))),
        };
      case 'code':
        return block;
    }
  });
}
