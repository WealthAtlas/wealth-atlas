import { describe, expect, it, vi } from 'vitest';
import { Logger } from '../../utils/Logger';
import { buildCriticSystemPrompt, parseReviewVerdict, reviewAnswer } from './ChatCritic';

describe('parseReviewVerdict', () => {
  it('reads a pass', () => {
    expect(parseReviewVerdict({ verdict: 'pass' })).toEqual({ verdict: 'pass' });
  });

  it('reads a revise with its issues, trimmed and without blanks', () => {
    expect(
      parseReviewVerdict({ verdict: 'revise', issues: [' 8g: recommends a sale ', '', 3] })
    ).toEqual({ verdict: 'revise', issues: ['8g: recommends a sale'] });
  });

  it('passes a revise that names no issue, since there is nothing to fix', () => {
    expect(parseReviewVerdict({ verdict: 'revise', issues: [] })).toEqual({ verdict: 'pass' });
  });

  it('cannot read anything else', () => {
    expect(parseReviewVerdict({ verdict: 'maybe' })).toBeUndefined();
    expect(parseReviewVerdict('looks fine')).toBeUndefined();
  });
});

describe('buildCriticSystemPrompt', () => {
  it('carries the rules it checks, in the adviser rulebook wording', () => {
    const prompt = buildCriticSystemPrompt();

    expect(prompt).toContain('8g. Close a gap with new money before you close it with a sale.');
    expect(prompt).toContain('8h. Conditions can outrank the target');
    expect(prompt).toContain('8i. A fund you remember is not a fund.');
    // Formatting is not the reviewer's business.
    expect(prompt).not.toContain('9. Keep answers short.');
  });
});

describe('reviewAnswer', () => {
  const base = { question: 'q', draft: 'd', consulted: ['listAssets'], untraced: ['14'] };

  it('hands over the consulted tools and the untraced figures', async () => {
    const chat = vi.fn(async () => ({ verdict: 'pass' }));
    await reviewAnswer({ chat, ...base });

    const [{ messages }] = chat.mock.calls[0] as unknown as [{ messages: { content: string }[] }];
    expect(messages[1].content).toContain('## Tools consulted\n\nlistAssets');
    expect(messages[1].content).toContain('could not trace\n\n14');
  });

  it('passes the draft with a warning when the verdict is unusable', async () => {
    const warn = vi.spyOn(Logger, 'warn').mockImplementation(() => {});
    const chat = vi.fn(async () => ({ thoughts: 'hmm' }));

    const { verdict, warnings } = await reviewAnswer({ chat, ...base });

    expect(verdict).toEqual({ verdict: 'pass' });
    expect(warnings).toEqual(['This answer could not be double-checked.']);
    warn.mockRestore();
  });

  it('passes the draft with a warning when the review call fails', async () => {
    const warn = vi.spyOn(Logger, 'warn').mockImplementation(() => {});
    const chat = vi.fn(async () => {
      throw new Error('rate limited');
    });

    const { verdict, warnings } = await reviewAnswer({ chat, ...base });

    expect(verdict).toEqual({ verdict: 'pass' });
    expect(warnings).toHaveLength(1);
    warn.mockRestore();
  });
});
