import { describe, expect, it } from 'vitest';
import { AssetCategory } from '../entities/assets/AssetCategory';
import { ExpenseCategory } from '../entities/expenses/ExpenseCategory';
import {
  buildChatSystemPrompt,
  buildChatUserPrompt,
  buildToolResultPrompt,
} from './ChatPromptBuilder';
import { ChatSnapshot } from './ChatContextBuilder';
import { CHAT_TOOLS } from './ChatTools';

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
  allocation: [],
  recentSpending: {
    months: 3,
    total: 12000,
    averagePerMonth: 4000,
    essentialShare: 100,
    topCategories: [],
  },
  goals: [],
  committedNextMonth: { sip: 20000, emi: 45000, total: 65000 },
  unratedCurrencies: ['USD'],
};

describe('buildChatSystemPrompt', () => {
  // The catalogue is generated from the registry, so a tool added without a
  // prompt edit is still advertised. This is the guarantee that keeps them in
  // step, so it is asserted rather than assumed.
  it('advertises every registered tool, with its description', () => {
    const prompt = buildChatSystemPrompt();

    for (const tool of CHAT_TOOLS) {
      expect(prompt).toContain(tool.name);
      expect(prompt).toContain(tool.description);
    }
  });

  it('documents the arguments of every tool that takes them', () => {
    const prompt = buildChatSystemPrompt();

    for (const tool of CHAT_TOOLS.filter(entry => entry.argsHint)) {
      expect(prompt).toContain(tool.argsHint!);
    }
  });

  it('lists the real asset and expense categories', () => {
    const prompt = buildChatSystemPrompt();

    for (const category of Object.values(AssetCategory)) {
      expect(prompt).toContain(`"${category}"`);
    }
    for (const category of Object.values(ExpenseCategory)) {
      expect(prompt).toContain(`"${category}"`);
    }
  });

  it('states the response shapes the loop can parse', () => {
    const prompt = buildChatSystemPrompt();

    expect(prompt).toContain('"toolCalls"');
    expect(prompt).toContain('"reply"');
  });

  it('forbids invented numbers and requires the unrated-currency caveat', () => {
    const prompt = buildChatSystemPrompt();

    expect(prompt).toContain('NEVER invent');
    expect(prompt).toContain('unratedCurrencies');
  });

  // There is no income entity, so a surplus figure could only be invented.
  it('says income is not tracked and must be asked for', () => {
    expect(buildChatSystemPrompt()).toContain('does not track income');
  });
});

describe('buildChatUserPrompt', () => {
  it('carries the snapshot and the question', () => {
    const prompt = buildChatUserPrompt(SNAPSHOT, 'how am I doing?');

    expect(prompt).toContain('"netWorth": 250000');
    expect(prompt).toContain('"unratedCurrencies"');
    expect(prompt).toContain('how am I doing?');
  });
});

describe('buildToolResultPrompt', () => {
  it('labels each result with the tool and the arguments it ran with', () => {
    const prompt = buildToolResultPrompt([
      { name: 'getExpenseBreakdown', args: { months: 3 }, result: { total: 12000 } },
    ]);

    expect(prompt).toContain('getExpenseBreakdown');
    expect(prompt).toContain('"months":3');
    expect(prompt).toContain('"total": 12000');
  });

  it('names what has already been consulted, to stop a repeat call', () => {
    const prompt = buildToolResultPrompt(
      [{ name: 'listAssets', args: {}, result: {} }],
      ['getGoalProgress', 'listAssets', 'getGoalProgress']
    );

    expect(prompt).toContain('Already consulted this question:');
    // Deduplicated, so the list stays readable.
    expect(prompt.match(/getGoalProgress/g)).toHaveLength(1);
    expect(prompt).toContain('Do not call any of these again');
  });

  it('omits the consulted line on the first tool result', () => {
    const prompt = buildToolResultPrompt([{ name: 'listAssets', args: {}, result: {} }]);

    expect(prompt).not.toContain('Already consulted');
  });

  it('omits an empty argument list', () => {
    const prompt = buildToolResultPrompt([
      { name: 'getPortfolioSummary', args: {}, result: { totalWealth: 1 } },
    ]);

    expect(prompt).toContain('### getPortfolioSummary\n');
    expect(prompt).not.toContain('{}');
  });
});
