import { describe, expect, it } from 'vitest';
import { buildChatSystemPrompt, buildSpecialistSystemPrompt } from '../ChatPromptBuilder';
import { CHAT_TOOLS } from '../ChatTools';
import { SPECIALISTS } from './ChatAgents';

describe('SPECIALISTS', () => {
  // A tool no specialist carries is reachable only on the direct route, so a
  // researched answer would silently never consult it.
  it('covers every tool in the registry', () => {
    const covered = new Set(SPECIALISTS.flatMap(specialist => specialist.tools.map(t => t.name)));
    const stranded = CHAT_TOOLS.map(tool => tool.name).filter(name => !covered.has(name));

    expect(stranded).toEqual([]);
  });

  it('gives every specialist the calculator and the exchange rates', () => {
    for (const specialist of SPECIALISTS) {
      const names = specialist.tools.map(tool => tool.name);
      expect(names).toContain('runCalculation');
      expect(names).toContain('getExchangeRates');
    }
  });

  it('keeps the market tools away from the cashflow specialist', () => {
    const cashflow = SPECIALISTS.find(specialist => specialist.id === 'cashflow')!;
    const names = cashflow.tools.map(tool => tool.name);

    expect(names).not.toContain('getMarketTrends');
    expect(names).not.toContain('getNewsSentiment');
  });
});

describe('buildSpecialistSystemPrompt', () => {
  const markets = SPECIALISTS.find(specialist => specialist.id === 'markets')!;
  const prompt = buildSpecialistSystemPrompt(markets);

  it('lists only its own tools', () => {
    expect(prompt).toContain('- getNewsSentiment —');
    expect(prompt).not.toContain('- listExpenses —');
  });

  it('carries the figure rules in the adviser rulebook wording', () => {
    const adviser = buildChatSystemPrompt();
    const rule1 = adviser.match(/^1\. NEVER.*$/m)![0];
    const rule8i = adviser.match(/^8i\. .*$/m)![0];

    expect(prompt).toContain(rule1);
    expect(prompt).toContain(rule8i);
  });

  // A researcher that recommends has reached a conclusion before the adviser
  // has seen the other areas' evidence.
  it('carries neither the persona nor the rules about what to recommend', () => {
    expect(prompt).not.toContain('## Who you are');
    expect(prompt).not.toContain('8g. Close a gap');
    expect(prompt).not.toContain('8h. Conditions can outrank');
    expect(prompt).toContain('you do not recommend anything');
  });
});
