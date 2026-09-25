import { Logger } from '../../utils/Logger';
import type { TurnsChatFn } from '../ChatLoop';
import { buildReviewRules, RuleKey } from '../ChatPromptBuilder';

/**
 * Reviews a draft answer against the rules a model is most likely to break
 * while sounding right, before the user sees it.
 *
 * The checked set is the rules whose violation reads as a *correct* answer: an
 * invented figure (1, 3), two currencies added together (4, 4a), a zeroed
 * holding quoted as a real total (5), a sale where a redirect would do (8g), a
 * crisis the model remembers rather than was shown (8h), a fund named from
 * memory (8i), a weighting judged with no target to weigh it against (8b, 8c).
 * Tone, length and formatting are deliberately not checked: a revision costs a
 * whole adviser turn, and spending it on style is how a reviewer becomes the
 * thing that makes answers worse.
 *
 * The reviewer is told which tools were consulted — not their results, which
 * would double the request — because most of these rules are about whether the
 * evidence was *in front of* the adviser: 8h without getMarketTrends or
 * getNewsSentiment, 8i without screenFunds or compareFunds. The figure check's
 * untraced numbers come in as hints for rule 1.
 *
 * A reviewer that fails passes the draft. The answer is already written, and
 * losing it to a broken review is a worse outcome than showing it unreviewed.
 */

const REVIEWED_RULES: RuleKey[] = ['1', '3', '4', '4a', '5', '8b', '8c', '8g', '8h', '8i'];

export type ReviewVerdict = { verdict: 'pass' } | { verdict: 'revise'; issues: string[] };

export function buildCriticSystemPrompt(): string {
  return `You review a draft answer from the adviser inside Wealth Atlas, a personal wealth tracking app, before the user sees it. You do not rewrite it.

You are given the user's question, the draft, the tools the adviser consulted, and any figures in the draft that an automatic check could not find in the snapshot or the tool results.

Send the draft back only for a clear violation of one of the rules below — a figure with no source, a claim about markets or news with no tool behind it, two currencies added together, a sale recommended where rule 8g says to redirect new money, a fund named without a fund tool having been consulted, a weighting judged without a target. An untraced figure is a hint, not proof: a count, a month total or a difference the draft explains is fine. Do not send it back for tone, length, formatting or anything you would merely have phrased differently.

Return ONLY a JSON object, one of:
{"verdict":"pass"}
{"verdict":"revise","issues":["<the rule broken and the exact sentence that breaks it>"]}

## Rules the adviser was given

${buildReviewRules(REVIEWED_RULES)}`;
}

export function buildCriticUserPrompt(args: {
  question: string;
  draft: string;
  consulted: string[];
  untraced: string[];
}): string {
  const consulted =
    args.consulted.length > 0 ? Array.from(new Set(args.consulted)).join(', ') : 'none';
  const untraced = args.untraced.length > 0 ? args.untraced.join(', ') : 'none';
  return `## Question\n\n${args.question}\n\n## Tools consulted\n\n${consulted}\n\n## Figures the automatic check could not trace\n\n${untraced}\n\n## Draft\n\n${args.draft}`;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/** Anything short of a well-formed "revise" with at least one issue passes. */
export function parseReviewVerdict(raw: unknown): ReviewVerdict | undefined {
  const payload = asRecord(raw);
  if (!payload) return undefined;
  if (payload.verdict === 'pass') return { verdict: 'pass' };
  if (payload.verdict !== 'revise') return undefined;

  const issues = Array.isArray(payload.issues)
    ? payload.issues
        .filter((issue): issue is string => typeof issue === 'string')
        .map(issue => issue.trim())
        .filter(issue => issue.length > 0)
    : [];

  return issues.length > 0 ? { verdict: 'revise', issues } : { verdict: 'pass' };
}

export async function reviewAnswer(args: {
  chat: TurnsChatFn;
  question: string;
  draft: string;
  consulted: string[];
  untraced: string[];
  signal?: AbortSignal;
}): Promise<{ verdict: ReviewVerdict; warnings: string[] }> {
  try {
    const raw = await args.chat({
      messages: [
        { role: 'system', content: buildCriticSystemPrompt() },
        { role: 'user', content: buildCriticUserPrompt(args) },
      ],
      signal: args.signal,
      reasoning: 'low',
    });

    const verdict = parseReviewVerdict(raw);
    if (verdict) return { verdict, warnings: [] };

    Logger.warn('Answer review returned an unusable verdict:', raw);
    return { verdict: { verdict: 'pass' }, warnings: ['This answer could not be double-checked.'] };
  } catch (error) {
    args.signal?.throwIfAborted();
    Logger.warn('Answer review failed:', error);
    return { verdict: { verdict: 'pass' }, warnings: ['This answer could not be double-checked.'] };
  }
}
