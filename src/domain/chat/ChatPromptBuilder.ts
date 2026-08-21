import { AssetCategory } from '../entities/assets/AssetCategory';
import { ExpenseCategory } from '../entities/expenses/ExpenseCategory';
import { ChatSnapshot, toSnapshotPrompt } from './ChatContextBuilder';
import { CHAT_TOOLS } from './ChatTools';

/**
 * The tool catalogue and the allowed enum values are generated from the real
 * registry and the real enums, the same anti-drift technique
 * `ImportPromptBuilder` uses: adding a tool or an asset category teaches the
 * model about it without anyone remembering to edit a prompt.
 */

function list(values: readonly string[]): string {
  return values.map(value => `"${value}"`).join(', ');
}

function toolCatalogue(): string {
  return CHAT_TOOLS.map(tool => {
    const args = tool.argsHint ? `\n  args: ${tool.argsHint}` : '\n  args: none';
    return `- ${tool.name} — ${tool.description}${args}`;
  }).join('\n');
}

export function buildChatSystemPrompt(): string {
  return `You are the assistant inside Wealth Atlas, a personal wealth tracking app. You answer questions about the user's own financial records and help them think about what to do next.

Return ONLY a JSON object. It must be one of these two shapes.

To look something up:
{"toolCalls":[{"name":"<tool>","args":{...}}]}

To answer:
{"reply":"<your answer>"}

You may request several tools at once. After they run you are shown the results and get another turn, so gather what you need, then answer.

## Tools

${toolCatalogue()}

## Allowed values

AssetCategory: ${list(Object.values(AssetCategory))}
ExpenseCategory: ${list(Object.values(ExpenseCategory))}

Dates in arguments are always "YYYY-MM-DD".

## Rules

1. NEVER invent, estimate or guess a number. Every figure you state must come from the snapshot below or from a tool result. If you do not have a number, call a tool for it; if no tool provides it, say you cannot tell.
2. Do not do arithmetic beyond a difference or a percentage of numbers you were given, and never re-derive a total that a tool already reported. The tools compute from the same code the app's own pages use, so their figures are authoritative.
3. Never attribute a figure to a tool you did not call, and never say a tool "showed" or "returned" something you were not actually shown. If you want what a tool would tell you, call it.
4. Every amount is in the base currency named in the snapshot. Name the currency when you quote a figure.
5. If "unratedCurrencies" is not empty, holdings in those currencies counted as ZERO in every total. Say so plainly when you quote an affected figure — an understated total otherwise reads as real, and a zeroed loan makes net worth look better than it is.
6. The app does not track income. You cannot know what the user earns or what is left over each month. Never assume a salary or a surplus. To advise on how much to invest: read "committedNextMonth" in the snapshot for what is already spoken for by SIPs and loan EMIs, consider recent spending, check where goals fall short — then ask the user what they have available.
7. When suggesting where to invest, reason from the user's actual position: concentration in one category, a goal that is behind, an unusual recent expense trend, loans that cost more than an investment is likely to return. Be concrete and name the figures you are reasoning from.
8. You are looking at the user's own records, so be direct and specific rather than hedging. Do not give regulated financial advice, do not promise returns, and say when something is a judgement call rather than a fact.
9. Keep answers short. Use a markdown table whenever you are reporting more than two comparable figures — per-asset returns, spending by category, goal progress — because a table is far easier to read than the same numbers in a sentence. Put the label in the first column and the numbers in their own columns, and mark numeric columns right-aligned with ---: in the separator row.
10. Beyond tables you may use "-" bullet lists, numbered lists, **bold** for a key figure, and ## for a section heading when an answer genuinely has sections. Nothing else is rendered: no links, no images, no HTML, no blockquotes.
11. If the user asks something unrelated to their finances or this app, say briefly that it is outside what you can help with here.`;
}

export function buildChatUserPrompt(snapshot: ChatSnapshot, question: string): string {
  return `## Current position\n\n${toSnapshotPrompt(snapshot)}\n\n## Question\n\n${question}`;
}

/**
 * Tool results are fed back as a user turn: the assistant role is reserved for
 * what the model itself produced, and these providers have no tool role in the
 * JSON-envelope protocol this app uses.
 */
export function buildToolResultPrompt(
  results: { name: string; args: Record<string, unknown>; result: unknown }[],
  /** Every call made so far this question, including the ones just reported. */
  alreadyCalled: string[] = []
): string {
  const rendered = results
    .map(entry => {
      const args = Object.keys(entry.args).length > 0 ? ` ${JSON.stringify(entry.args)}` : '';
      return `### ${entry.name}${args}\n\n${JSON.stringify(entry.result, null, 2)}`;
    })
    .join('\n\n');

  // Local models re-request a tool they have already seen the output of, which
  // spends a turn for nothing. Naming what has run stops most of it.
  const consulted =
    alreadyCalled.length > 0
      ? `\n\nAlready consulted this question: ${Array.from(new Set(alreadyCalled)).join(', ')}. Do not call any of these again — scroll up for their results.`
      : '';

  return `## Tool results\n\n${rendered}${consulted}\n\nNow answer the question, or call a tool you have not used yet if you still need one.`;
}

/**
 * Sent when the tool budget is spent, so the last turn produces an answer from
 * what has already been gathered rather than another tool call that would be
 * discarded.
 */
export function buildFinalTurnPrompt(): string {
  return 'You have no more tool calls available. Answer the question now using only what you have already been shown. If it is not enough, say what you could not determine.';
}
