import { describe, expect, it } from 'vitest';
import { AssetCategory } from '../entities/assets/AssetCategory';
import { ExpenseCategory } from '../entities/expenses/ExpenseCategory';
import { Memory, MemoryKind } from '../entities/memory/Memory';
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
    byCurrency: [
      {
        currency: 'INR',
        total: 12000,
        averagePerMonth: 4000,
        essentialShare: 100,
        topCategories: [],
      },
    ],
  },
  goals: [],
  committedNextMonth: { sip: 20000, emi: 45000, total: 65000 },
  allocationDrift: { isSet: false, outOfBand: [] },
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

  // A figure the user states carries its own currency, and rule 12 sends the
  // model to reason from it. Observed against the real provider: with a stored
  // "5,000 pounds a month", three replies in four either invented a rate or
  // relabelled the amount as rupees — one of them asserting a monthly income of
  // 5,000 rupees against a 34,833 rupee EMI without noticing. Both faults are
  // invisible in the answer, so the rule is prose and nothing else would catch
  // its removal.
  it('routes a remembered figure in another currency through getExchangeRates', () => {
    const prompt = buildChatSystemPrompt();

    expect(prompt).toContain('\n4a.');
    expect(prompt).toContain('call getExchangeRates and name the rate you used');
    expect(prompt).toContain('Never recall a rate');
    expect(prompt).toContain('never restate an amount in a currency the user did not give it in');
    expect(prompt).toContain('say you cannot convert it');
  });

  // Earlier turns are sent, but nothing used to tell the model they were the
  // same conversation, so a bare follow-up read as a new, unanswerable question.
  it('tells the model earlier turns are the same conversation', () => {
    const prompt = buildChatSystemPrompt();

    expect(prompt).toContain('## Conversation');
    expect(prompt).toContain('same conversation');
    // The transcript carries the tool traffic, so a re-cut of something already
    // looked up must not cost another call.
    expect(prompt).toContain('still above');
    expect(prompt).toContain('clarifying question');
  });

  // The persona is what turns a correct answer into a useful one: without it the
  // model answers a question about a portfolio, not this person's portfolio, and
  // it hedges every sentence rather than recommending anything. It is prose, so
  // nothing but a test catches its removal.
  it("casts the model as this user's own adviser, with a view of its own", () => {
    const prompt = buildChatSystemPrompt();

    expect(prompt).toContain('## Who you are');
    expect(prompt).toContain('Lead with the recommendation');
    expect(prompt).toContain('Be candid rather than agreeable');
    // The persona is the one place that could quietly turn into a licensed
    // adviser, so the disclaimer travels with it rather than only in rule 8.
    expect(prompt).toContain('not a licensed adviser');
  });

  // The drift row for an overweight category literally says action "sell", and a
  // model reading it tells the user to sell — realising tax and breaking
  // lock-ins the app cannot even see — when redirecting the next few
  // contributions closes the same gap for nothing.
  it('closes a drift with new contributions before a sale', () => {
    const prompt = buildChatSystemPrompt();

    expect(prompt).toContain('\n8g.');
    expect(prompt).toContain('Close a gap with new money before you close it with a sale');
    expect(prompt).toContain('most underweight rows');
    expect(prompt).toContain('capital gains tax, an exit load or a broken lock-in');
    expect(prompt).toContain(
      'Never tell someone to sell a holding purely because a percentage moved'
    );
  });

  // A target set in calm weather is a default, not a ceiling — but the model's
  // training ended long before today, so a macro claim it did not read in a tool
  // result this turn is a remembered crisis quoted as current, which is the most
  // convincing wrong sentence it can write.
  it('allows a sized, evidenced departure from the target and nothing looser', () => {
    const prompt = buildChatSystemPrompt();

    expect(prompt).toContain('\n8h.');
    expect(prompt).toContain('Conditions can outrank the target');
    expect(prompt).toContain('a floor and a default, not a ceiling');
    expect(prompt).toContain('deliberate departure from what they told you they wanted');
    expect(prompt).toContain('The evidence must be in this conversation');
    expect(prompt).toContain('your training ended well before today');
    expect(prompt).toContain('Never name a macro condition you were not shown');
    // The feed has no geopolitics or commodities topic (see CATEGORY_TOPICS), so
    // a war or a rate decision is only ever an indirect read.
    expect(prompt).toContain('no geopolitics or commodities topic');
  });

  // 8b used to forbid a market figure deciding anything at all, which 8h now
  // contradicts. The sequencing it was really protecting — policy first, so a
  // tilt has something to be measured from — has to survive that.
  it('still puts the allocation policy in front of any market figure', () => {
    const prompt = buildChatSystemPrompt();

    expect(prompt).toContain('Never answer a buy-or-sell question from a market figure alone');
    expect(prompt).toContain('a tilt is measured from the policy');
  });

  // Rule 2 used to ban arithmetic outright; runCalculation replaces the ban with
  // a destination, and a model told only "do not" will still quietly guess.
  it('sends arithmetic to runCalculation rather than banning it', () => {
    const prompt = buildChatSystemPrompt();

    expect(prompt).toContain('runCalculation');
    expect(prompt).toContain('do not work it out in your head');
    // The sandbox is offline, and a snippet that assumes otherwise wastes a turn.
    expect(prompt).toContain('no network and no database access');
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

describe('the memory block', () => {
  const now = new Date('2026-08-23T00:00:00Z');
  const remembered = new Memory({
    id: 3,
    kind: MemoryKind.Context,
    text: 'Can invest about 50,000 a month.',
    source: 'user',
    createdAt: now,
    updatedAt: now,
  });

  // An empty heading is an invitation: a model shown a blank section fills it,
  // and starts asserting preferences the user never stated. A rule describing a
  // section that is not there does the same thing, so the two travel together.
  it('is absent entirely when nothing is remembered', () => {
    const prompt = buildChatSystemPrompt([]);

    expect(prompt).not.toContain('What you remember about this user');
    expect(prompt).not.toContain('\n12.');
  });

  it('appears with rule 12 once there is something to remember', () => {
    const prompt = buildChatSystemPrompt([remembered]);

    expect(prompt).toContain('## What you remember about this user');
    expect(prompt).toContain('[3] (context) Can invest about 50,000 a month.');
    expect(prompt).toContain('\n12.');
    // Rule 12 is what sends the model to a remembered monthly amount, so it is
    // where a foreign-currency one has to be handed to rule 4a.
    expect(prompt).toContain('rule 4a governs how you may compare it');
  });

  // Rule 11 is referred to by number from the Conversation section, so the
  // memory rule had to be appended rather than slotted in.
  it('leaves rule 11 reachable by that number', () => {
    for (const prompt of [buildChatSystemPrompt([]), buildChatSystemPrompt([remembered])]) {
      expect(prompt).toContain('\n11. If the user asks something unrelated');
      expect(prompt).toContain('Rule 11 is for a genuinely unrelated topic');
    }
  });

  // Rule 6 tells the assistant to ask what the user has available. A memory that
  // already records it is the one thing that overrides that.
  it('says the remembered amount overrides asking again', () => {
    const prompt = buildChatSystemPrompt([remembered]);

    expect(prompt).toContain('overrides rule 6');
  });

  it('never lets memory outrank a measured figure', () => {
    const prompt = buildChatSystemPrompt([remembered]);

    expect(prompt).toContain('The snapshot and the tools outrank them on every figure');
    expect(prompt).toContain('Never quote a portfolio figure from memory');
  });

  it('defaults to no memory, so an unmigrated caller cannot leak a stale block', () => {
    expect(buildChatSystemPrompt()).toBe(buildChatSystemPrompt([]));
  });
});
