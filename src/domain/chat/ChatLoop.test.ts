import { LlmMessage } from '@/data/llm/LlmClient';
import { describe, expect, it } from 'vitest';
import { asset, fakeContext, loan } from './ChatFixtures';
import { ChatSnapshot } from './ChatContextBuilder';
import { MAX_TOOL_STEPS, runChatLoop, trimTranscript, TurnsChatFn } from './ChatLoop';
import { ChatToolContext } from './ChatToolContext';

const SNAPSHOT: ChatSnapshot = {
  asOf: '2026-08-20',
  baseCurrency: 'INR',
  netWorth: 250000,
  totalAssetValue: 300000,
  totalInvested: 200000,
  totalProfitLoss: 100000,
  profitLossPercentage: 50,
  totalLoanOutstanding: 50000,
  assetCount: 1,
  loanCount: 1,
  goalCount: 0,
  allocation: [{ category: 'Index Fund', percentage: 100 }],
  recentSpending: {
    months: 3,
    byCurrency: [
      {
        currency: 'INR',
        total: 12000,
        averagePerMonth: 4000,
        essentialShare: 100,
        topCategories: [{ category: 'Groceries', amount: 12000 }],
      },
    ],
  },
  goals: [],
  committedNextMonth: { sip: 20000, emi: 45000, total: 65000 },
  unratedCurrencies: [],
};

/**
 * A transport that replies with each scripted turn in order, and records the
 * message array it was handed so a test can inspect what the model would see.
 */
function scripted(
  turns: unknown[]
): TurnsChatFn & { calls: LlmMessage[][]; efforts: (string | undefined)[] } {
  const calls: LlmMessage[][] = [];
  const efforts: (string | undefined)[] = [];
  let index = 0;

  const chat = async ({ messages, reasoning }: { messages: LlmMessage[]; reasoning?: string }) => {
    calls.push(messages.map(message => ({ ...message })));
    efforts.push(reasoning);
    const turn = turns[Math.min(index, turns.length - 1)];
    index++;
    return turn;
  };

  return Object.assign(chat, { calls, efforts });
}

function ask(
  chat: TurnsChatFn,
  context: ChatToolContext = fakeContext(),
  history: LlmMessage[] = []
) {
  return runChatLoop({
    chat,
    context,
    snapshot: SNAPSHOT,
    history,
    question: 'what is my net worth?',
  });
}

describe('runChatLoop', () => {
  it('returns an answer given straight away, with no tools consulted', async () => {
    const answer = await ask(scripted([{ reply: 'INR 250,000.' }]));

    expect(answer.reply).toBe('INR 250,000.');
    expect(answer.toolTrace).toEqual([]);
    expect(answer.warnings).toEqual([]);
  });

  it('sends the system prompt and the snapshot with the question', async () => {
    const chat = scripted([{ reply: 'ok' }]);
    await ask(chat);

    const [system, user] = chat.calls[0];
    expect(system.role).toBe('system');
    expect(system.content).toContain('Wealth Atlas');
    expect(user.content).toContain('"netWorth": 250000');
    expect(user.content).toContain('what is my net worth?');
  });

  it('runs a requested tool and feeds the result back before answering', async () => {
    const chat = scripted([
      { toolCalls: [{ name: 'getPortfolioSummary' }] },
      { reply: 'Net worth is INR 250,000.' },
    ]);

    const answer = await ask(chat, fakeContext({ assets: [asset()], loans: [loan()] }));

    expect(answer.reply).toBe('Net worth is INR 250,000.');
    expect(answer.toolTrace).toEqual([{ name: 'getPortfolioSummary', args: {} }]);

    // Second request carries the model's own turn plus the tool result.
    const second = chat.calls[1];
    expect(second.some(message => message.role === 'assistant')).toBe(true);
    expect(second[second.length - 1].content).toContain('Tool results');
    expect(second[second.length - 1].content).toContain('totalWealth');
  });

  it('runs several tools requested in one turn, in order', async () => {
    const chat = scripted([
      { toolCalls: [{ name: 'getPortfolioSummary' }, { name: 'getAssetAllocation' }] },
      { reply: 'done' },
    ]);

    const answer = await ask(chat, fakeContext({ assets: [asset()] }));

    expect(answer.toolTrace.map(entry => entry.name)).toEqual([
      'getPortfolioSummary',
      'getAssetAllocation',
    ]);
  });

  it('passes tool arguments through', async () => {
    const chat = scripted([
      { toolCalls: [{ name: 'getExpenseBreakdown', args: { months: 3 } }] },
      { reply: 'done' },
    ]);

    const answer = await ask(chat);

    expect(answer.toolTrace[0].args).toEqual({ months: 3 });
  });

  it('reports each tool as it starts, for the progress caption', async () => {
    const started: string[] = [];
    const chat = scripted([{ toolCalls: [{ name: 'getPortfolioSummary' }] }, { reply: 'done' }]);

    await runChatLoop({
      chat,
      context: fakeContext(),
      snapshot: SNAPSHOT,
      history: [],
      question: 'q',
      onToolCall: name => started.push(name),
    });

    expect(started).toEqual(['getPortfolioSummary']);
  });

  it('chains tool calls across turns', async () => {
    const chat = scripted([
      { toolCalls: [{ name: 'listAssets' }] },
      { toolCalls: [{ name: 'getAssetDetail', args: { assetId: 1 } }] },
      { reply: 'Your index fund is up 50%.' },
    ]);

    const answer = await ask(chat, fakeContext({ assets: [asset({ id: 1 })] }));

    expect(answer.reply).toBe('Your index fund is up 50%.');
    expect(answer.toolTrace.map(entry => entry.name)).toEqual(['listAssets', 'getAssetDetail']);
  });

  it('warns about an unknown tool and still answers', async () => {
    const chat = scripted([{ toolCalls: [{ name: 'getCryptoPrices' }] }, { reply: 'answer' }]);

    const answer = await ask(chat);

    expect(answer.reply).toBe('answer');
    expect(answer.toolTrace).toEqual([]);
    expect(answer.warnings.join(' ')).toContain('getCryptoPrices');
  });

  it('nudges a model that says nothing, rather than looping silently', async () => {
    const chat = scripted([{}, { reply: 'answer' }]);

    const answer = await ask(chat);

    expect(answer.reply).toBe('answer');
    expect(chat.calls[1][chat.calls[1].length - 1].content).toContain('no more tool calls');
    expect(answer.warnings.join(' ')).toContain('without an answer');
  });

  // A model that keeps calling tools must not run at the user's expense
  // indefinitely.
  it('gives up after the tool budget and says so', async () => {
    const chat = scripted([{ toolCalls: [{ name: 'getPortfolioSummary' }] }]);

    const answer = await ask(chat);

    expect(answer.reply).toContain('could not settle on an answer');
    expect(answer.warnings.join(' ')).toContain(`within ${MAX_TOOL_STEPS} tool steps`);
    // The budget bounds tool steps; the final request is answer-only.
    expect(answer.toolTrace).toHaveLength(MAX_TOOL_STEPS);
    expect(chat.calls).toHaveLength(MAX_TOOL_STEPS + 1);
  });

  it('asks for a final answer once the budget is nearly spent', async () => {
    const chat = scripted([{ toolCalls: [{ name: 'getPortfolioSummary' }] }]);
    await ask(chat);

    const finalRequest = chat.calls[chat.calls.length - 1];
    expect(finalRequest[finalRequest.length - 1].content).toContain('no more tool calls');
  });

  it('reports a failing tool to the model instead of abandoning the question', async () => {
    const broken: ChatToolContext = {
      ...fakeContext(),
      assets: async () => {
        throw new Error('database is gone');
      },
    };
    const chat = scripted([
      { toolCalls: [{ name: 'getPortfolioSummary' }] },
      { reply: 'I could not read your assets.' },
    ]);

    const answer = await runChatLoop({
      chat,
      context: broken,
      snapshot: SNAPSHOT,
      history: [],
      question: 'q',
    });

    expect(answer.reply).toBe('I could not read your assets.');
    expect(answer.warnings.join(' ')).toContain('Could not read getPortfolioSummary');
    // The model is told the lookup failed, and told not to invent the figures.
    expect(chat.calls[1][chat.calls[1].length - 1].content).toContain('Do not guess');
  });

  it('reports a response that was not JSON at all', async () => {
    const chat = scripted([['not', 'an', 'object'], { reply: 'answer' }]);

    const answer = await ask(chat);

    expect(answer.reply).toBe('answer');
    expect(answer.warnings.join(' ')).toContain('did not return a JSON object');
  });

  it('places prior turns between the system prompt and the current question', async () => {
    const history: LlmMessage[] = [
      { role: 'user', content: 'how much do I have in gold?' },
      { role: 'assistant', content: 'INR 40,000.' },
    ];
    const chat = scripted([{ reply: 'ok' }]);

    await ask(chat, fakeContext(), history);

    const messages = chat.calls[0];
    expect(messages.map(message => message.role)).toEqual(['system', 'user', 'assistant', 'user']);
    expect(messages[1].content).toBe('how much do I have in gold?');
    // Only the live question carries a snapshot, so stale figures never linger.
    expect(messages[1].content).not.toContain('netWorth');
    expect(messages[3].content).toContain('netWorth');
  });

  // A prose turn in history teaches the model that prose is allowed, and the
  // next reply comes back unparseable. History has to look like the contract.
  it('re-wraps a prior plain-text reply as the JSON envelope', async () => {
    const history: LlmMessage[] = [
      { role: 'user', content: 'how much do I have in gold?' },
      { role: 'assistant', content: 'INR 40,000.' },
    ];
    const chat = scripted([{ reply: 'ok' }]);

    await ask(chat, fakeContext(), history);

    expect(chat.calls[0][2].content).toBe(JSON.stringify({ reply: 'INR 40,000.' }));
  });

  it('leaves a history turn that is already an envelope alone', async () => {
    const envelope = JSON.stringify({ reply: 'INR 40,000.' });
    const history: LlmMessage[] = [
      { role: 'user', content: 'how much do I have in gold?' },
      { role: 'assistant', content: envelope },
    ];
    const chat = scripted([{ reply: 'ok' }]);

    await ask(chat, fakeContext(), history);

    expect(chat.calls[0][2].content).toBe(envelope);
  });

  it('returns a transcript carrying the tool traffic behind the answer', async () => {
    const chat = scripted([
      { toolCalls: [{ name: 'getPortfolioSummary' }] },
      { reply: 'INR 250,000.' },
    ]);

    const answer = await ask(chat);

    // question, the tool-call turn, the results, the reply.
    expect(answer.transcript.map(message => message.role)).toEqual([
      'user',
      'assistant',
      'user',
      'assistant',
    ]);
    // Stored bare: the snapshot belongs to the turn it was built for.
    expect(answer.transcript[0].content).toBe('what is my net worth?');
    expect(answer.transcript[0].content).not.toContain('netWorth');
    // The results are what makes "break that down" answerable without a re-run.
    expect(answer.transcript[2].content).toContain('## Tool results');
  });

  it('feeds the previous transcript back as the model context', async () => {
    const first = await ask(
      scripted([{ toolCalls: [{ name: 'getPortfolioSummary' }] }, { reply: 'INR 250,000.' }])
    );

    const chat = scripted([{ reply: 'Mostly index funds.' }]);
    await runChatLoop({
      chat,
      context: fakeContext(),
      snapshot: SNAPSHOT,
      history: first.transcript,
      question: 'where is it concentrated?',
    });

    const sent = chat.calls[0];
    expect(sent[0].role).toBe('system');
    // The earlier question, its tool call, its results and its answer all survive.
    expect(sent.some(message => message.content.includes('## Tool results'))).toBe(true);
    expect(sent.some(message => message.content === 'what is my net worth?')).toBe(true);
    expect(sent[sent.length - 1].content).toContain('where is it concentrated?');
  });

  // The nudge is true for the question it was sent on and false afterwards.
  it('leaves the out-of-budget nudge out of the transcript', async () => {
    const chat = scripted([{ toolCalls: [{ name: 'getPortfolioSummary' }] }]);

    const answer = await ask(chat);

    expect(answer.warnings.join(' ')).toContain('did not produce an answer');
    expect(answer.transcript.some(message => message.content.includes('no more tool calls'))).toBe(
      false
    );
  });

  it('stops at an abort rather than running the next turn', async () => {
    const controller = new AbortController();
    const chat = scripted([{ toolCalls: [{ name: 'getPortfolioSummary' }] }, { reply: 'late' }]);
    controller.abort();

    await expect(
      runChatLoop({
        chat,
        context: fakeContext(),
        snapshot: SNAPSHOT,
        history: [],
        question: 'q',
        signal: controller.signal,
      })
    ).rejects.toThrow();

    expect(chat.calls).toHaveLength(0);
  });
});

describe('trimTranscript', () => {
  const turn = (role: 'user' | 'assistant', content: string): LlmMessage => ({ role, content });

  it('keeps everything that fits', () => {
    const transcript = [turn('user', 'q'), turn('assistant', 'a')];

    expect(trimTranscript(transcript, 1000)).toEqual(transcript);
  });

  it('drops the oldest turns and says so', () => {
    const transcript = [
      turn('user', 'old question'),
      turn('assistant', 'x'.repeat(300)),
      turn('user', 'new question'),
      turn('assistant', 'recent answer'),
    ];

    const trimmed = trimTranscript(transcript, 100);

    expect(trimmed[0].content).toContain('Earlier messages');
    expect(trimmed.slice(1)).toEqual(transcript.slice(2));
  });

  // An assistant turn at the front reads as the answer to a question the model
  // cannot see, which is the confusion the transcript exists to remove.
  it('advances the kept slice to a question', () => {
    const transcript = [
      turn('user', 'q1'),
      turn('user', 'tool results'),
      turn('assistant', 'y'.repeat(80)),
    ];

    const trimmed = trimTranscript(transcript, 100);

    expect(trimmed[1].role).toBe('user');
  });

  it('carries one note however often it is trimmed', () => {
    const transcript = [
      turn('user', 'q1'),
      turn('assistant', 'z'.repeat(300)),
      turn('user', 'q2'),
      turn('assistant', 'z'.repeat(300)),
      turn('user', 'q3'),
    ];

    const once = trimTranscript(transcript, 50);
    const twice = trimTranscript(
      [...once, turn('assistant', 'z'.repeat(300)), turn('user', 'q4')],
      50
    );

    expect(twice.filter(message => message.content.includes('Earlier messages'))).toHaveLength(1);
  });
});

describe('reasoning effort per turn', () => {
  it('asks for little on the routing turn and more once results are in hand', async () => {
    // The first turn picks tools from a catalogue; the second has to combine
    // what they returned. Only the second is worth paying to think about.
    const chat = scripted([
      { toolCalls: [{ name: 'getPortfolioSummary', args: {} }] },
      { reply: 'Your net worth is 250,000 INR.' },
    ]);

    await ask(chat);

    expect(chat.efforts).toEqual(['low', 'high']);
  });

  it('keeps asking for more on every turn after the first', async () => {
    const chat = scripted([
      { toolCalls: [{ name: 'getPortfolioSummary', args: {} }] },
      { toolCalls: [{ name: 'getAssetAllocation', args: {} }] },
      { reply: 'Mostly index funds.' },
    ]);

    await ask(chat);

    expect(chat.efforts).toEqual(['low', 'high', 'high']);
  });

  it('answers a snapshot-only question at low effort, which is the intended trade', async () => {
    const chat = scripted([{ reply: 'Your net worth is 250,000 INR.' }]);

    await ask(chat);

    expect(chat.efforts).toEqual(['low']);
  });
});
