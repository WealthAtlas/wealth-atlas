import { LlmMessage } from '@/data/llm/LlmClient';
import { Logger } from '../utils/Logger';
import { ChatSnapshot } from './ChatContextBuilder';
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
}

export interface ChatLoopArgs {
  chat: TurnsChatFn;
  context: ChatToolContext;
  snapshot: ChatSnapshot;
  /**
   * The conversation so far, holding only the plain questions and answers — not
   * the snapshot or the tool traffic. The snapshot is attached to the current
   * question only, so a follow-up reasons about fresh figures rather than the
   * ones that were true two questions ago.
   */
  history: LlmMessage[];
  question: string;
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

export async function runChatLoop({
  chat,
  context,
  snapshot,
  history,
  question,
  signal,
  onToolCall,
}: ChatLoopArgs): Promise<ChatAnswer> {
  const messages: LlmMessage[] = [
    { role: 'system', content: buildChatSystemPrompt() },
    ...history,
    { role: 'user', content: buildChatUserPrompt(snapshot, question) },
  ];

  const toolTrace: ChatToolTraceEntry[] = [];
  const warnings: string[] = [];

  // One iteration past the tool budget, so there is always a turn left in which
  // the model can answer from what the last tool call returned.
  for (let step = 0; step <= MAX_TOOL_STEPS; step++) {
    signal?.throwIfAborted();

    const raw = await chat({ messages, signal });
    const { turn, warnings: turnWarnings } = parseAssistantTurn(raw, CHAT_TOOL_NAMES);
    warnings.push(...turnWarnings);

    // Kept verbatim so the model sees its own previous turn, including any tool
    // call whose result follows.
    messages.push({ role: 'assistant', content: JSON.stringify(raw) });

    if (turn.reply) {
      return { reply: turn.reply, toolTrace, warnings };
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

    messages.push({
      role: 'user',
      content: buildToolResultPrompt(
        results,
        toolTrace.map(entry => entry.name)
      ),
    });

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
  };
}
