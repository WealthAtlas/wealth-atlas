import { LlmMessage } from '@/data/llm/LlmClient';
import { asset, chatSnapshot, fakeContext, loan } from '@/domain/chat/ChatFixtures';
import { runChatLoop, TurnsChatFn } from '@/domain/chat/ChatLoop';
import { ChatProgress } from '@/domain/chat/agents/ChatAdviser';
import { Logger } from '@/domain/utils/Logger';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runChatGraph } from './ChatGraph';

/**
 * Drives the real LangGraph run with a transport that answers by *who is
 * asking*, read off the system prompt. Order across specialists is not fixed —
 * they run concurrently — so a script keyed by position would be a race.
 */

type Role = 'router' | 'portfolio' | 'cashflow' | 'markets' | 'adviser' | 'critic';

function roleOf(messages: LlmMessage[]): Role {
  const system = messages[0].content;
  if (system.startsWith('You route questions')) return 'router';
  if (system.startsWith('You review a draft')) return 'critic';
  const researcher = system.match(/^You are the (\w+) researcher/);
  if (researcher) return researcher[1].toLowerCase() as Role;
  return 'adviser';
}

type Responder = (messages: LlmMessage[], call: number) => unknown | Promise<unknown>;

function byRole(responders: Partial<Record<Role, Responder>>) {
  const calls: { role: Role; messages: LlmMessage[] }[] = [];
  let inFlight = 0;
  let maxInFlight = 0;

  const chat: TurnsChatFn = async ({ messages }) => {
    const role = roleOf(messages);
    const call = calls.filter(entry => entry.role === role).length;
    calls.push({ role, messages: messages.map(message => ({ ...message })) });

    inFlight++;
    maxInFlight = Math.max(maxInFlight, inFlight);
    try {
      // A tick of real latency, so concurrent specialists actually overlap.
      await new Promise(resolve => setTimeout(resolve, 5));
      const responder = responders[role];
      if (!responder) throw new Error(`No script for ${role}`);
      return await responder(messages, call);
    } finally {
      inFlight--;
    }
  };

  return {
    chat,
    calls,
    of: (role: Role) => calls.filter(entry => entry.role === role),
    maxInFlight: () => maxInFlight,
  };
}

/** A researcher that looks one thing up, then reports. */
function researcher(tool: string, finding: string): Responder {
  return (_messages, call) => (call === 0 ? { toolCalls: [{ name: tool }] } : { reply: finding });
}

function ask(chat: TurnsChatFn, extra: Partial<Parameters<typeof runChatGraph>[0]> = {}) {
  return runChatGraph({
    chat,
    context: fakeContext({ assets: [asset()], loans: [loan()] }),
    snapshot: chatSnapshot(),
    history: [],
    question: 'should I put more into my index fund?',
    memories: [],
    ...extra,
  });
}

afterEach(() => vi.restoreAllMocks());

describe('runChatGraph — direct route', () => {
  it('answers with the single loop, and stores what the loop would have stored', async () => {
    const script = byRole({
      router: () => ({ route: 'direct' }),
      adviser: () => ({ reply: 'Net worth is INR 250,000.' }),
    });

    const answer = await ask(script.chat, { question: 'what is my net worth?' });

    const loopOnly = await runChatLoop({
      chat: async () => ({ reply: 'Net worth is INR 250,000.' }),
      context: fakeContext(),
      snapshot: chatSnapshot(),
      history: [],
      question: 'what is my net worth?',
      memories: [],
    });

    expect(answer.reply).toBe('Net worth is INR 250,000.');
    expect(answer.transcript).toEqual(loopOnly.transcript);
    expect(answer.warnings).toEqual([]);
  });

  // Every figure traces to the snapshot, so a reviewer has nothing to catch.
  it('skips the model review when every figure is traced', async () => {
    const script = byRole({
      router: () => ({ route: 'direct' }),
      adviser: () => ({ reply: 'Net worth is INR 250,000.' }),
    });

    await ask(script.chat);

    expect(script.of('critic')).toHaveLength(0);
  });

  it('asks for a model review when a figure cannot be traced', async () => {
    const script = byRole({
      router: () => ({ route: 'direct' }),
      adviser: () => ({ reply: 'Expect 14% a year.' }),
      critic: () => ({ verdict: 'pass' }),
    });

    await ask(script.chat);

    const [review] = script.of('critic');
    expect(review.messages[1].content).toContain('could not trace\n\n14');
  });

  it('answers directly when the router returns nonsense', async () => {
    const warn = vi.spyOn(Logger, 'warn').mockImplementation(() => {});
    const script = byRole({
      router: () => 'I think the portfolio agent',
      adviser: () => ({ reply: 'Net worth is INR 250,000.' }),
    });

    const answer = await ask(script.chat);

    expect(answer.reply).toBe('Net worth is INR 250,000.');
    warn.mockRestore();
  });
});

describe('runChatGraph — specialists', () => {
  const plan = {
    route: 'specialists',
    specialists: [
      { agent: 'portfolio', brief: 'How much is in the index fund, and is it on target?' },
      { agent: 'markets', brief: 'What is the equity benchmark doing?' },
    ],
  };

  function researched(adviser: Responder, critic: Responder = () => ({ verdict: 'pass' })) {
    return byRole({
      router: () => plan,
      portfolio: researcher('getPortfolioSummary', '- Net worth is INR 250,000 (snapshot).'),
      markets: researcher('getMarketTrends', '- Market data is unavailable (getMarketTrends).'),
      adviser,
      critic,
    });
  }

  it('runs the specialists concurrently', async () => {
    const script = researched(() => ({ reply: 'Keep going.' }));
    await ask(script.chat);

    expect(script.of('portfolio')).toHaveLength(2);
    expect(script.of('markets')).toHaveLength(2);
    expect(script.maxInFlight()).toBeGreaterThanOrEqual(2);
  });

  it('gives each specialist only its brief and its own tools', async () => {
    const script = researched(() => ({ reply: 'Keep going.' }));
    await ask(script.chat);

    const [first] = script.of('markets');
    const system = first.messages[0].content;
    expect(system).toContain('- getMarketTrends —');
    expect(system).not.toContain('- listExpenses —');
    // No earlier conversation: the brief is meant to stand alone.
    expect(first.messages).toHaveLength(2);
    expect(first.messages[1].content).toContain('What is the equity benchmark doing?');
  });

  it('shows the adviser every finding and the results behind them', async () => {
    const script = researched(() => ({ reply: 'Keep going.' }));
    await ask(script.chat);

    const [adviser] = script.of('adviser');
    const prompt = adviser.messages[adviser.messages.length - 1].content;
    expect(prompt).toContain('## What the researchers found');
    expect(prompt).toContain('### Portfolio (asked: How much is in the index fund');
    expect(prompt).toContain('### Markets (asked: What is the equity benchmark doing?)');
    expect(prompt).toContain('### getPortfolioSummary');
    expect(prompt).toContain('Already consulted: ');
    // The research sits between the snapshot and the question.
    expect(prompt.indexOf('## Current position')).toBeLessThan(prompt.indexOf('## What the'));
    expect(prompt.indexOf('## What the')).toBeLessThan(prompt.indexOf('## Question'));
  });

  it('stores one results turn and the adviser answer, not what the specialists said', async () => {
    const script = researched(() => ({ reply: 'Keep going.' }));
    const answer = await ask(script.chat);

    expect(answer.transcript.map(message => message.role)).toEqual(['user', 'user', 'assistant']);
    const [question, results, reply] = answer.transcript;
    expect(question.content).toBe('should I put more into my index fund?');
    expect(results.content).toContain('### getPortfolioSummary');
    expect(results.content).toContain('### getMarketTrends');
    expect(results.content).not.toContain('researcher');
    expect(JSON.parse(reply.content)).toEqual({ reply: 'Keep going.' });
  });

  it('tags each consulted tool with the specialist that read it', async () => {
    const script = researched(() => ({ reply: 'Keep going.' }));
    const answer = await ask(script.chat);

    expect(answer.toolTrace).toEqual(
      expect.arrayContaining([
        { name: 'getPortfolioSummary', args: {}, agent: 'portfolio' },
        { name: 'getMarketTrends', args: {}, agent: 'markets' },
      ])
    );
  });

  it('always has a researched answer reviewed', async () => {
    const script = researched(() => ({ reply: 'Keep going.' }));
    await ask(script.chat);

    const [review] = script.of('critic');
    expect(review.messages[1].content).toContain('getPortfolioSummary');
    expect(review.messages[1].content).toContain('getMarketTrends');
  });

  it('sends a rejected draft back once, and keeps only the revision', async () => {
    const script = researched(
      (_messages, call) => ({ reply: call === 0 ? 'Sell the index fund.' : 'Redirect new money.' }),
      () => ({ verdict: 'revise', issues: ['8g: recommends a sale where a redirect would do'] })
    );

    const answer = await ask(script.chat);

    expect(answer.reply).toBe('Redirect new money.');
    expect(script.of('adviser')).toHaveLength(2);
    // The revision is final; it is not reviewed by the model a second time.
    expect(script.of('critic')).toHaveLength(1);

    const revision = script.of('adviser')[1].messages.at(-1)!.content;
    expect(revision).toContain('## Your previous draft was sent back');
    expect(revision).toContain('Sell the index fund.');
    expect(revision).toContain('8g: recommends a sale');

    const replies = answer.transcript.filter(message => message.role === 'assistant');
    expect(replies).toEqual([{ role: 'assistant', content: '{"reply":"Redirect new money."}' }]);
  });

  it('still answers when one specialist fails, and says which', async () => {
    const error = vi.spyOn(Logger, 'error').mockImplementation(() => {});
    const script = byRole({
      router: () => plan,
      portfolio: researcher('getPortfolioSummary', '- Net worth is INR 250,000.'),
      markets: () => {
        throw new Error('provider down');
      },
      adviser: () => ({ reply: 'Keep going.' }),
      critic: () => ({ verdict: 'pass' }),
    });

    const answer = await ask(script.chat);

    expect(answer.reply).toBe('Keep going.');
    expect(answer.warnings).toContain('The markets research could not be completed.');
    const prompt = script.of('adviser')[0].messages.at(-1)!.content;
    expect(prompt).toContain('This research could not be completed.');
    error.mockRestore();
  });

  it('reports each stage as it starts', async () => {
    const script = researched(() => ({ reply: 'Keep going.' }));
    const progress: ChatProgress[] = [];

    await ask(script.chat, { onProgress: step => progress.push(step) });

    const stages = progress.map(step => step.stage);
    expect(stages[0]).toBe('planning');
    expect(progress).toContainEqual({
      stage: 'researching',
      agent: 'Markets',
      tool: 'getMarketTrends',
    });
    expect(stages).toContain('answering');
    expect(stages.at(-1)).toBe('reviewing');
  });

  it('stops when the question is cancelled mid-research', async () => {
    const controller = new AbortController();
    const script = byRole({
      router: () => plan,
      portfolio: () => {
        controller.abort();
        return { toolCalls: [{ name: 'getPortfolioSummary' }] };
      },
      markets: researcher('getMarketTrends', '- nothing'),
      adviser: () => ({ reply: 'should never be written' }),
    });

    await expect(ask(script.chat, { signal: controller.signal })).rejects.toBeDefined();
    expect(script.of('adviser')).toHaveLength(0);
  });
});
