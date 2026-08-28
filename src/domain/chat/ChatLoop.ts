import { LlmMessage, TRUNCATED_REPLY } from '@/data/llm/LlmClient';
import { ReasoningEffort } from '@/data/llm/presets';
import { Logger } from '../utils/Logger';
import { ChatSnapshot } from './ChatContextBuilder';
import { Memory } from '../entities/memory/Memory';
import {
  buildChatSystemPrompt,
  buildChatUserPrompt,
  buildFinalTurnPrompt,
  buildToolResultPrompt,
} from './ChatPromptBuilder';
import { ChatToolContext } from './ChatToolContext';
import { CHAT_TOOL_NAMES, CHAT_TOOLS_BY_NAME } from './ChatTools';
import { ChatToolCall, parseAssistantTurn } from './ChatTurn';

/**
 * The agent loop: send the snapshot and the question, run whatever tools the
 * model asks for, feed the results back, and stop at the answer it settles on.
 *
 * Pure apart from the injected transport and tool context, so the whole
 * interaction can be driven from a scripted `chat` in tests without a network,
 * a configured provider or a database.
 */

/**
 * The provider transport, injected so the loop can be tested without a network
 * or a configured provider — same idiom as `DataImportService`.
 */
export type TurnsChatFn = (args: {
  messages: LlmMessage[];
  signal?: AbortSignal;
  reasoning?: ReasoningEffort;
}) => Promise<unknown>;

/**
 * How many times the model may call tools before it must answer. Five is well
 * clear of what a real question needs (the deepest is roughly: summary,
 * allocation, drill into one asset) while stopping a confused model from
 * looping at the user's expense.
 */
export const MAX_TOOL_STEPS = 5;

export interface ChatToolTraceEntry {
  name: string;
  args: Record<string, unknown>;
}

export interface ChatAnswer {
  reply: string;
  /** What was consulted, in call order, for display under the reply. */
  toolTrace: ChatToolTraceEntry[];
  /** Contract violations and tool failures worth surfacing, never silent. */
  warnings: string[];
  /**
   * The whole conversation including this question's tool traffic, to be handed
   * straight back as `history` next time. Returned rather than reassembled by
   * the caller: only the loop knows which turns are durable and which were
   * scaffolding for this question alone.
   */
  transcript: LlmMessage[];
}

export interface ChatLoopArgs {
  chat: TurnsChatFn;
  context: ChatToolContext;
  snapshot: ChatSnapshot;
  /**
   * The `transcript` from the previous answer: earlier questions, the replies,
   * and the tool calls and results behind them. Carrying the tool traffic is
   * what makes a follow-up work — "break that down by asset" needs the rows the
   * last answer was built from, and re-running every lookup to recover them is
   * both slow and a different set of figures.
   *
   * What does *not* carry is the snapshot. It is attached to the live question
   * only and stripped from the stored turn, so the model never has two
   * generations of net worth in front of it.
   */
  history: LlmMessage[];
  question: string;
  /**
   * What the assistant knows about the user, from `MemoryService`. Empty when
   * the user has switched memory off.
   *
   * Passed in alongside the snapshot rather than fetched here, and rendered into
   * the *system* prompt rather than the transcript — see `memorySection`. That
   * is what lets an edited memory take effect on the very next turn instead of
   * lingering in a stored turn the model can still read.
   */
  memories: readonly Memory[];
  signal?: AbortSignal;
  /** Fires as each tool starts, to caption the spinner with what is running. */
  onToolCall?: (name: string) => void;
}

interface ToolResult {
  name: string;
  args: Record<string, unknown>;
  result: unknown;
}

async function runTools(
  calls: ChatToolCall[],
  context: ChatToolContext,
  collect: {
    signal?: AbortSignal;
    onToolCall?: (name: string) => void;
    toolTrace: ChatToolTraceEntry[];
    warnings: string[];
  }
): Promise<ToolResult[]> {
  const results: ToolResult[] = [];

  for (const call of calls) {
    collect.signal?.throwIfAborted();

    // Unknown names are already filtered out by parseAssistantTurn.
    const tool = CHAT_TOOLS_BY_NAME.get(call.name);
    if (!tool) continue;

    collect.onToolCall?.(call.name);
    collect.toolTrace.push({ name: call.name, args: call.args });

    try {
      results.push({
        name: call.name,
        args: call.args,
        result: await tool.run(call.args, context),
      });
    } catch (error) {
      // A failed tool is reported back to the model rather than aborting the
      // question: it can often still answer from the calls that succeeded. The
      // result says so explicitly, because a bare error invites a guess.
      Logger.error(`Chat tool "${call.name}" failed:`, error);
      collect.warnings.push(`Could not read ${call.name}.`);
      results.push({
        name: call.name,
        args: call.args,
        result: {
          error: 'This lookup failed. Do not guess the figures it would have returned.',
        },
      });
    }
  }

  return results;
}

/**
 * The caller may hand back a transcript this loop wrote, or a plain
 * question-and-answer pair. The model is told to speak only in the JSON
 * envelope, and it copies the shape of the last assistant turn it can see, so a
 * bare markdown reply in history teaches it that prose is allowed and the next
 * turn comes back unparseable. Re-wrapping is the same reason an in-loop turn is
 * pushed back verbatim: history must never show the model breaking its own
 * contract.
 */
function toProtocolHistory(history: LlmMessage[]): LlmMessage[] {
  return history.map(message =>
    message.role === 'assistant' && !message.content.trimStart().startsWith('{')
      ? { role: 'assistant' as const, content: JSON.stringify({ reply: message.content }) }
      : message
  );
}

/**
 * How much conversation to carry. Tool results dominate it — a capped asset list
 * runs to a few thousand characters — so a handful of questions can outgrow a
 * modest context window, and the provider rejecting the request is a worse
 * outcome than losing the oldest exchange. Roughly 10k tokens.
 */
export const TRANSCRIPT_BUDGET_CHARS = 40_000;

const TRIM_NOTE =
  '[Earlier messages in this conversation were dropped to stay inside the context limit. If you need a figure from them, look it up again rather than recalling it.]';

/**
 * Keeps the newest turns that fit the budget.
 *
 * Trimmed from the front because a follow-up is nearly always about the last
 * thing said. The kept slice is advanced to a question: opening on an assistant
 * turn or a block of tool results reads as the answer to something the model can
 * no longer see, which is exactly the confusion this whole change is fixing.
 */
export function trimTranscript(
  transcript: LlmMessage[],
  budget = TRANSCRIPT_BUDGET_CHARS
): LlmMessage[] {
  // Fixed wording, and earlier copies are stripped first, so a conversation
  // trimmed several times carries one note rather than a stack of them.
  const source = transcript.filter(message => message.content !== TRIM_NOTE);

  let total = 0;
  let start = source.length;

  for (let index = source.length - 1; index >= 0; index--) {
    total += source[index].content.length;
    if (total > budget) break;
    start = index;
  }

  while (start < source.length && source[start].role !== 'user') start++;
  if (start === 0) return source;

  const kept = source.slice(start);
  if (kept.length === 0) return [];

  return [{ role: 'user', content: TRIM_NOTE }, ...kept];
}

export async function runChatLoop({
  chat,
  context,
  snapshot,
  history,
  question,
  memories,
  signal,
  onToolCall,
}: ChatLoopArgs): Promise<ChatAnswer> {
  const carried = trimTranscript(toProtocolHistory(history));

  const messages: LlmMessage[] = [
    { role: 'system', content: buildChatSystemPrompt(memories) },
    ...carried,
    { role: 'user', content: buildChatUserPrompt(snapshot, question) },
  ];

  const toolTrace: ChatToolTraceEntry[] = [];
  const warnings: string[] = [];

  /**
   * This question's turns that are worth keeping: what the model said, and what
   * the tools returned. The "no tool calls left" nudges are scaffolding for this
   * question and would be read as still true by the next one.
   */
  const durable: LlmMessage[] = [];

  // The question is stored bare. Its snapshot belongs to this turn only.
  const transcript = (): LlmMessage[] => [
    ...carried,
    { role: 'user', content: question },
    ...durable,
  ];

  // One iteration past the tool budget, so there is always a turn left in which
  // the model can answer from what the last tool call returned.
  for (let step = 0; step <= MAX_TOOL_STEPS; step++) {
    signal?.throwIfAborted();

    // The first turn has no tool results in front of it, so the model's job is
    // to pick tools — a shallow choice from a catalogue. From the second turn on
    // it is holding figures from several sources and has to combine them: which
    // way a drift points, whether a drawdown is a discount or a broken thesis,
    // what the journal says it concluded last time. That is where reasoning
    // earns its cost, and where a provider that thinks hard by default is
    // actually doing the right thing.
    //
    // A question answerable from the snapshot alone is therefore answered at low
    // effort. That is the intended trade: those are the simple ones.
    const raw = await chat({ messages, signal, reasoning: step === 0 ? 'low' : 'high' });

    // `extractJson` closed an envelope the model stopped short of finishing. It
    // could only be repaired up to the point the text stops, so the answer below
    // really is missing its ending — said plainly, because a reply that reads as
    // complete and simply ends early is the one failure the user cannot see.
    if (
      typeof raw === 'object' &&
      raw !== null &&
      (raw as Record<symbol, unknown>)[TRUNCATED_REPLY]
    ) {
      warnings.push('The model stopped before finishing this answer, so it may be cut short.');
    }

    const { turn, warnings: turnWarnings } = parseAssistantTurn(raw, CHAT_TOOL_NAMES);
    warnings.push(...turnWarnings);

    // Kept verbatim so the model sees its own previous turn, including any tool
    // call whose result follows.
    const assistantTurn: LlmMessage = { role: 'assistant', content: JSON.stringify(raw) };
    messages.push(assistantTurn);
    durable.push(assistantTurn);

    if (turn.reply) {
      return { reply: turn.reply, toolTrace, warnings, transcript: transcript() };
    }

    // The budget is spent: this turn was the model's chance to answer, so
    // running further tools would only discard their results.
    if (step === MAX_TOOL_STEPS) break;

    if (turn.toolCalls.length === 0) {
      // Nothing to run and nothing said — nudge it to answer and move on.
      messages.push({ role: 'user', content: buildFinalTurnPrompt() });
      continue;
    }

    const results = await runTools(turn.toolCalls, context, {
      signal,
      onToolCall,
      toolTrace,
      warnings,
    });

    const resultTurn: LlmMessage = {
      role: 'user',
      content: buildToolResultPrompt(
        results,
        toolTrace.map(entry => entry.name)
      ),
    };
    messages.push(resultTurn);
    durable.push(resultTurn);

    if (step === MAX_TOOL_STEPS - 1) {
      messages.push({ role: 'user', content: buildFinalTurnPrompt() });
    }
  }

  warnings.push(`The assistant did not produce an answer within ${MAX_TOOL_STEPS} tool steps.`);
  return {
    reply:
      'I could not settle on an answer for that. Try asking for one thing at a time, or rephrasing it.',
    toolTrace,
    warnings,
    // Carried anyway: the lookups that did run are what a rephrased follow-up
    // would otherwise have to pay for again.
    transcript: transcript(),
  };
}
