import { LlmMessage } from '@/data/llm/LlmClient';
import { describe, expect, it, vi } from 'vitest';
import { Logger } from '../../utils/Logger';
import {
  buildRouterSystemPrompt,
  parseRoutePlan,
  routeQuestion,
  routerHistory,
} from './ChatRouter';

describe('parseRoutePlan', () => {
  it('reads a direct route', () => {
    expect(parseRoutePlan({ route: 'direct' }).plan).toEqual({ route: 'direct' });
  });

  it('reads specialists with their briefs', () => {
    const { plan, warnings } = parseRoutePlan({
      route: 'specialists',
      specialists: [
        { agent: 'portfolio', brief: 'How far is gold from target?' },
        { agent: 'markets', brief: 'What is the gold benchmark doing?' },
      ],
    });

    expect(plan).toEqual({
      route: 'specialists',
      briefs: [
        { agent: 'portfolio', brief: 'How far is gold from target?' },
        { agent: 'markets', brief: 'What is the gold benchmark doing?' },
      ],
    });
    expect(warnings).toEqual([]);
  });

  it('accepts specialists without an explicit route', () => {
    const { plan } = parseRoutePlan({ specialists: [{ agent: 'cashflow', brief: 'Loans?' }] });
    expect(plan.route).toBe('specialists');
  });

  it('drops an unknown researcher with a warning, and a duplicate silently', () => {
    const { plan, warnings } = parseRoutePlan({
      route: 'specialists',
      specialists: [
        { agent: 'tax', brief: 'Capital gains?' },
        { agent: 'cashflow', brief: 'Loans?' },
        { agent: 'cashflow', brief: 'Loans again?' },
      ],
    });

    expect(plan).toEqual({
      route: 'specialists',
      briefs: [{ agent: 'cashflow', brief: 'Loans?' }],
    });
    expect(warnings).toEqual([
      'The router asked for an unknown researcher "tax", which was skipped.',
    ]);
  });

  // Every unusable plan must land on the single loop, which is a full answer.
  it.each([
    ['not an object', 'specialists please'],
    ['no specialists', { route: 'specialists' }],
    ['specialists not a list', { route: 'specialists', specialists: 'portfolio' }],
    [
      'only unknown researchers',
      { route: 'specialists', specialists: [{ agent: 'x', brief: 'y' }] },
    ],
    [
      'briefs all empty',
      { route: 'specialists', specialists: [{ agent: 'portfolio', brief: ' ' }] },
    ],
  ])('falls back to direct when %s', (_label, raw) => {
    expect(parseRoutePlan(raw).plan).toEqual({ route: 'direct' });
  });
});

describe('routerHistory', () => {
  it('keeps questions and replies, and drops tool traffic and trim notes', () => {
    const history: LlmMessage[] = [
      { role: 'user', content: '[Earlier messages in this conversation were dropped.]' },
      { role: 'user', content: 'what is gold worth?' },
      { role: 'assistant', content: '{"toolCalls":[{"name":"listAssets"}]}' },
      { role: 'user', content: '## Tool results\n\n### listAssets\n\n{}' },
      { role: 'assistant', content: '{"reply":"Gold is INR 1,68,200."}' },
    ];

    expect(routerHistory(history)).toEqual([
      { role: 'user', content: 'what is gold worth?' },
      { role: 'assistant', content: 'Gold is INR 1,68,200.' },
    ]);
  });

  it('keeps only the last three exchanges', () => {
    const history: LlmMessage[] = Array.from({ length: 5 }).flatMap((_, index) => [
      { role: 'user' as const, content: `q${index}` },
      { role: 'assistant' as const, content: `{"reply":"a${index}"}` },
    ]);

    expect(routerHistory(history).map(message => message.content)).toEqual([
      'q2',
      'a2',
      'q3',
      'a3',
      'q4',
      'a4',
    ]);
  });
});

describe('routeQuestion', () => {
  it('asks at low effort, with the catalogue of researchers', async () => {
    const chat = vi.fn(async () => ({ route: 'direct' }));
    await routeQuestion({ chat, history: [], question: 'should I buy gold?' });

    const [{ messages, reasoning }] = chat.mock.calls[0] as unknown as [
      { messages: LlmMessage[]; reasoning: string },
    ];
    expect(reasoning).toBe('low');
    expect(messages[0].content).toBe(buildRouterSystemPrompt());
    expect(messages[0].content).toContain('- markets —');
    expect(messages[messages.length - 1]).toEqual({ role: 'user', content: 'should I buy gold?' });
  });

  it('answers directly when the router call fails', async () => {
    const warn = vi.spyOn(Logger, 'warn').mockImplementation(() => {});
    const chat = vi.fn(async () => {
      throw new Error('provider down');
    });

    const { plan, warnings } = await routeQuestion({ chat, history: [], question: 'hi' });

    expect(plan).toEqual({ route: 'direct' });
    expect(warnings).toEqual([]);
    warn.mockRestore();
  });

  it('stops rather than falling back when the question was cancelled', async () => {
    const controller = new AbortController();
    const chat = vi.fn(async () => {
      controller.abort();
      throw new Error('aborted');
    });

    await expect(
      routeQuestion({ chat, history: [], question: 'hi', signal: controller.signal })
    ).rejects.toBeDefined();
  });
});
