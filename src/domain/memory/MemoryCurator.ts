import { LlmMessage } from '@/data/llm/LlmClient';
import { Memory } from '../entities/memory/Memory';
import { TurnsChatFn } from '../chat/ChatLoop';
import { buildCuratorPrompt } from './MemoryPromptBuilder';
import { MemoryOperation, parseMemoryOperations } from './MemoryOps';

/**
 * One background pass over the exchange that just finished, deciding what is
 * worth remembering about the user.
 *
 * Pure apart from the injected transport, exactly as `runChatLoop` is, so the
 * tests drive it with a scripted `chat` and never reach the network.
 *
 * This is a *separate* call rather than an extra field on the assistant's reply
 * envelope. The envelope would have been free, but the interesting work is not
 * noticing "I can invest 50,000" — it is reconciling it with the 40,000 already
 * on the list and deleting what has expired. That is a different task from
 * answering a question, it wants the whole memory list in front of it, and it is
 * cheap: one short prompt at low reasoning effort, off the critical path.
 *
 * It is deliberately given only the question and the reply, never the tool
 * traffic behind them. What is durable is what the user said; tool results are
 * the bulk of a transcript and hold nothing but figures, which the curator is
 * banned from storing anyway.
 */

export interface CurateArgs {
  chat: TurnsChatFn;
  memories: readonly Memory[];
  /** The user's question, as they typed it. */
  question: string;
  /** The assistant's answer to it. */
  reply: string;
  signal?: AbortSignal;
}

export interface CurationResult {
  operations: MemoryOperation[];
  warnings: string[];
}

export async function curateMemories({
  chat,
  memories,
  question,
  reply,
  signal,
}: CurateArgs): Promise<CurationResult> {
  const messages: LlmMessage[] = [
    { role: 'user', content: buildCuratorPrompt(memories, question, reply) },
  ];

  const raw = await chat({ messages, signal, reasoning: 'low' });

  const knownIds = new Set(
    memories.map(memory => memory.id).filter((id): id is number => id !== undefined)
  );

  return parseMemoryOperations(raw, knownIds, memories.length);
}
