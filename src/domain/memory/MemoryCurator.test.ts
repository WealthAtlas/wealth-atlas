import { describe, expect, it, vi } from 'vitest';
import { LlmMessage } from '@/data/llm/LlmClient';
import { IMemory, Memory, MemoryKind } from '../entities/memory/Memory';
import { TurnsChatFn } from '../chat/ChatLoop';
import { curateMemories } from './MemoryCurator';

function memory(
  id: number,
  kind: MemoryKind,
  text: string,
  source: IMemory['source'] = 'assistant'
) {
  const now = new Date('2026-08-01T00:00:00Z');
  return new Memory({ id, kind, text, source, createdAt: now, updatedAt: now });
}

/** Returns a fixed payload and records what it was sent. */
function scripted(payload: unknown) {
  const calls: { messages: LlmMessage[]; reasoning?: string }[] = [];
  const chat = vi.fn(async ({ messages, reasoning }) => {
    calls.push({ messages, reasoning });
    return payload;
  }) as unknown as TurnsChatFn & { calls: typeof calls };
  (chat as unknown as { calls: typeof calls }).calls = calls;
  return chat as TurnsChatFn & { calls: typeof calls };
}

const EXCHANGE = {
  question: 'how much should I invest this month?',
  reply: 'What do you have available? Your SIPs already commit 20,000.',
};

describe('curateMemories', () => {
  it('adds what the user said about themselves', async () => {
    const chat = scripted({
      operations: [{ op: 'add', kind: 'context', text: 'Can invest about 50,000 a month.' }],
    });

    const result = await curateMemories({
      chat,
      memories: [],
      question: 'I can put aside about 50,000 a month',
      reply: 'Then 30,000 is uncommitted after your SIPs.',
    });

    expect(result.warnings).toEqual([]);
    expect(result.operations).toEqual([
      { op: 'add', kind: MemoryKind.Context, text: 'Can invest about 50,000 a month.' },
    ]);
  });

  it('returns nothing when the model says nothing is durable', async () => {
    const result = await curateMemories({
      chat: scripted({ operations: [] }),
      memories: [],
      ...EXCHANGE,
    });
    expect(result.operations).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('updates an existing memory rather than adding a second', async () => {
    const stored = memory(7, MemoryKind.Context, 'Can invest about 50,000 a month.');
    const result = await curateMemories({
      chat: scripted({
        operations: [{ op: 'update', id: 7, text: 'Can invest about 60,000 a month.' }],
      }),
      memories: [stored],
      question: 'make it 60,000 now, I got a raise',
      reply: 'Noted.',
    });
    expect(result.operations).toEqual([
      { op: 'update', id: 7, text: 'Can invest about 60,000 a month.' },
    ]);
  });

  it('deletes when the user asks to forget', async () => {
    const stored = memory(4, MemoryKind.Context, 'Can invest about 50,000 a month.');
    const result = await curateMemories({
      chat: scripted({ operations: [{ op: 'delete', id: 4 }] }),
      memories: [stored],
      question: 'forget what I told you about my monthly amount',
      reply: 'Done.',
    });
    expect(result.operations).toEqual([{ op: 'delete', id: 4 }]);
  });

  it('warns rather than throwing on a malformed response', async () => {
    const result = await curateMemories({
      chat: scripted('I have updated your memory.'),
      memories: [],
      ...EXCHANGE,
    });
    expect(result.operations).toEqual([]);
    expect(result.warnings).toHaveLength(1);
  });

  // The invariant the whole feature is built around. A stored figure is worse
  // here than anywhere else: it is re-injected into every later conversation and
  // is wrong by tomorrow. If the model proposes one anyway, the ops still parse —
  // it is the prompt that must forbid it, so this pins the prompt.
  it('forbids storing computed figures in the instruction it sends', async () => {
    const chat = scripted({ operations: [] });
    await curateMemories({
      chat,
      memories: [],
      question: "what's my net worth?",
      reply: 'Your net worth is 8,700,000 INR across 9 assets.',
    });

    const sent = chat.calls[0].messages[0].content;
    expect(sent).toContain('NEVER store a figure the app can compute');
    expect(sent).toContain('net worth');
    // The worked example for exactly this question.
    expect(sent).toContain('User: "What\'s my net worth?" → {"operations":[]}');
  });

  // Rule 3: an action with figures behind it is a decision-journal entry, and a
  // memory impersonating one is unverifiable and immediately stale.
  it('forbids recording what the user did rather than what they want', async () => {
    const chat = scripted({ operations: [] });
    await curateMemories({
      chat,
      memories: [],
      question: 'I bought some gold last week',
      reply: 'Noted — that is not recorded in your transactions yet.',
    });

    const sent = chat.calls[0].messages[0].content;
    expect(sent).toContain('Record what the user IS or WANTS, never what they DID');
    expect(sent).toContain('decision journal');
    expect(sent).toContain('User: "I bought some gold last week." → {"operations":[]}');
  });

  it('sends the exchange and the current list, and nothing else', async () => {
    const chat = scripted({ operations: [] });
    await curateMemories({
      chat,
      memories: [memory(1, MemoryKind.Preference, 'Prefers index funds.')],
      question: 'and gold?',
      reply: 'Gold is 12% of your portfolio.',
    });

    expect(chat.calls).toHaveLength(1);
    // One user turn: there is no conversation to maintain here.
    expect(chat.calls[0].messages).toHaveLength(1);
    expect(chat.calls[0].messages[0].role).toBe('user');

    const sent = chat.calls[0].messages[0].content;
    expect(sent).toContain('[1] (preference) Prefers index funds.');
    expect(sent).toContain('and gold?');
    expect(sent).toContain('Gold is 12% of your portfolio.');
  });

  it('runs at low reasoning effort, being a cheap background pass', async () => {
    const chat = scripted({ operations: [] });
    await curateMemories({ chat, memories: [], ...EXCHANGE });
    expect(chat.calls[0].reasoning).toBe('low');
  });

  it('says so when nothing is remembered yet', async () => {
    const chat = scripted({ operations: [] });
    await curateMemories({ chat, memories: [], ...EXCHANGE });
    expect(chat.calls[0].messages[0].content).toContain('(nothing remembered yet)');
  });

  it('gates ids on the list it was given', async () => {
    const result = await curateMemories({
      chat: scripted({ operations: [{ op: 'delete', id: 99 }] }),
      memories: [memory(1, MemoryKind.Context, 'Retiring around 2045.')],
      ...EXCHANGE,
    });
    expect(result.operations).toEqual([]);
    expect(result.warnings[0]).toContain('does not exist');
  });

  it('passes the abort signal through', async () => {
    const controller = new AbortController();
    const chat = vi.fn(async ({ signal }) => {
      expect(signal).toBe(controller.signal);
      return { operations: [] };
    }) as unknown as TurnsChatFn;

    await curateMemories({
      chat,
      memories: [],
      ...EXCHANGE,
      signal: controller.signal,
    });
    expect(chat).toHaveBeenCalledOnce();
  });
});
