import { LlmMessage } from '@/data/llm/LlmClient';
import { Logger } from '../../utils/Logger';
import type { TurnsChatFn } from '../ChatLoop';
import { SPECIALISTS, SPECIALISTS_BY_ID, SpecialistId } from './ChatAgents';

/**
 * Decides whether a question goes to the research specialists or straight to
 * the single loop the assistant has always had.
 *
 * The direct route is not a degraded mode, it is the right answer for most
 * questions: "what is my net worth?" is in the snapshot, "break that down" is a
 * re-cut of results already in the transcript, and a clarifying question needs
 * no research at all. Dispatching those to specialists would spend three calls
 * to learn what one would have. So the specialists are for the questions that
 * actually span areas — what to buy, whether they can afford something, how to
 * rebalance — where one agent juggling every tool is where the wrong one gets
 * picked.
 *
 * Every failure falls back to direct. A router that throws, returns prose, or
 * names only specialists that do not exist costs one wasted call and leaves the
 * user exactly where they would have been before the graph existed.
 */

export interface SpecialistBrief {
  agent: SpecialistId;
  /** A self-contained sub-question: the specialist sees no earlier turns. */
  brief: string;
}

export type RoutePlan = { route: 'direct' } | { route: 'specialists'; briefs: SpecialistBrief[] };

/** How much of the conversation the router reads, newest last. */
const ROUTER_HISTORY_EXCHANGES = 3;
const ROUTER_HISTORY_CHARS = 600;

export function buildRouterSystemPrompt(): string {
  const catalogue = SPECIALISTS.map(
    specialist =>
      `- ${specialist.id} — ${specialist.focus}. Tools: ${specialist.tools.map(tool => tool.name).join(', ')}.`
  ).join('\n');

  return `You route questions inside Wealth Atlas, a personal wealth tracking app. You do not answer them.

A question goes one of two ways.

"direct": one assistant answers with every tool available. Use it for anything that needs one area or none — a figure in the snapshot, a single lookup, a follow-up that re-cuts or explains the previous answer, a clarification, a greeting, or anything off-topic.

"specialists": researchers look things up in parallel, then an adviser weighs what they found. Use it only when the question needs evidence from more than one area before it can be answered well — what to buy or sell, where new money should go, whether they can afford something, how to rebalance, whether they are on track.

The researchers:
${catalogue}

Return ONLY a JSON object, one of:
{"route":"direct"}
{"route":"specialists","specialists":[{"agent":"<id>","brief":"<what to find out>"}]}

A brief is read by a researcher who cannot see the conversation, so it must stand on its own: resolve "that", "it" and "those" into what they refer to, and name the assets, loans, goals or categories concerned. Pick only the researchers the question needs, at most one brief each. When in doubt, choose "direct".`;
}

/** The reply text of an envelope turn, or the turn itself if it is not one. */
function replyText(message: LlmMessage): string {
  if (message.role !== 'assistant') return message.content;
  try {
    const parsed = JSON.parse(message.content) as { reply?: unknown };
    return typeof parsed.reply === 'string' ? parsed.reply : '';
  } catch {
    return message.content;
  }
}

function clip(text: string): string {
  return text.length > ROUTER_HISTORY_CHARS ? `${text.slice(0, ROUTER_HISTORY_CHARS)}…` : text;
}

/**
 * The last few questions and replies, without the tool traffic between them.
 * The router needs to know what "that" refers to, not the rows behind it, and
 * the transcript's tool results are by far its largest part.
 */
export function routerHistory(history: LlmMessage[]): LlmMessage[] {
  const exchanges: LlmMessage[] = [];

  for (const message of history) {
    if (message.role === 'user' && message.content.startsWith('## Tool results')) continue;
    if (message.role === 'user' && message.content.startsWith('[Earlier messages')) continue;
    if (message.role === 'system') continue;

    const text = replyText(message);
    if (text.trim() === '') continue;
    exchanges.push({ role: message.role, content: clip(text) });
  }

  return exchanges.slice(-ROUTER_HISTORY_EXCHANGES * 2);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Lenient in the same way `parseAssistantTurn` is: a half-followed contract
 * yields a usable plan and a warning. Anything it cannot use reads as "direct".
 */
export function parseRoutePlan(raw: unknown): { plan: RoutePlan; warnings: string[] } {
  const warnings: string[] = [];
  const payload = asRecord(raw);
  const direct = { plan: { route: 'direct' } as RoutePlan, warnings };

  if (!payload) return direct;

  const rawSpecialists = payload.specialists;
  if (payload.route !== 'specialists' && rawSpecialists === undefined) return direct;
  if (!Array.isArray(rawSpecialists)) return direct;

  const briefs: SpecialistBrief[] = [];
  for (const candidate of rawSpecialists) {
    const record = asRecord(candidate);
    const agent = typeof record?.agent === 'string' ? record.agent.trim() : '';
    const brief = typeof record?.brief === 'string' ? record.brief.trim() : '';

    if (!SPECIALISTS_BY_ID.has(agent)) {
      warnings.push(`The router asked for an unknown researcher "${agent}", which was skipped.`);
      continue;
    }
    if (!brief || briefs.some(existing => existing.agent === agent)) continue;
    briefs.push({ agent: agent as SpecialistId, brief });
  }

  if (briefs.length === 0) return direct;
  return { plan: { route: 'specialists', briefs }, warnings };
}

export async function routeQuestion(args: {
  chat: TurnsChatFn;
  history: LlmMessage[];
  question: string;
  signal?: AbortSignal;
}): Promise<{ plan: RoutePlan; warnings: string[] }> {
  try {
    const raw = await args.chat({
      messages: [
        { role: 'system', content: buildRouterSystemPrompt() },
        ...routerHistory(args.history),
        { role: 'user', content: args.question },
      ],
      signal: args.signal,
      reasoning: 'low',
    });
    return parseRoutePlan(raw);
  } catch (error) {
    // A cancelled question must stop here, not carry on down the direct route.
    args.signal?.throwIfAborted();
    Logger.warn('Chat router failed, answering directly:', error);
    // Silent to the user on purpose: the direct route is a full answer, so
    // nothing they would see is worse for the router having failed.
    return { plan: { route: 'direct' }, warnings: [] };
  }
}
