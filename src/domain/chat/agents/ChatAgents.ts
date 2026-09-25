import type { RuleKey } from '../ChatPromptBuilder';
import { CHAT_TOOLS_BY_NAME, ChatTool } from '../ChatTools';

/**
 * The research specialists the router can dispatch a question to.
 *
 * Each one sees a slice of the registry rather than all of it. A catalogue of
 * sixteen tools is where a model starts reaching for the adjacent one — the
 * market tools for a loan question, which rule 1a exists to stop — and a
 * specialist that can only see its own area cannot make that mistake. The
 * adviser that writes the answer still has the whole registry, because its rules
 * name tools from every area and a rule pointing at a tool it cannot call reads
 * as an instruction it cannot follow.
 *
 * `rules` picks the entries of the shared rulebook the specialist carries: the
 * ones about reading and quoting figures, never the ones about what to
 * recommend, which belong to the adviser alone. `ChatAgents.test.ts` pins that
 * every tool in the registry is reachable from at least one specialist, so a
 * tool added later cannot be stranded on the direct route.
 */

export type SpecialistId = 'portfolio' | 'cashflow' | 'markets';

export interface Specialist {
  id: SpecialistId;
  /** Shown in the progress caption and the trace: "Portfolio · list of assets". */
  label: string;
  /** One line for the router's catalogue, and the specialist's own brief. */
  focus: string;
  tools: readonly ChatTool[];
  rules: readonly RuleKey[];
}

/** Every specialist can compute and convert: neither belongs to one area. */
const SHARED_TOOLS = ['runCalculation', 'getExchangeRates'];

/** How every specialist reads and quotes a figure. */
const SHARED_RULES: RuleKey[] = ['1', '2', '2a', '3', '4', '4a', '5'];

function tools(names: string[]): ChatTool[] {
  return [...names, ...SHARED_TOOLS].map(name => {
    const tool = CHAT_TOOLS_BY_NAME.get(name);
    if (!tool) throw new Error(`Specialist refers to unknown tool "${name}".`);
    return tool;
  });
}

export const SPECIALISTS: readonly Specialist[] = [
  {
    id: 'portfolio',
    label: 'Portfolio',
    focus:
      'what the user holds — assets, returns, allocation against their target, monthly investment and goal progress',
    tools: tools([
      'getPortfolioSummary',
      'getAssetAllocation',
      'listAssets',
      'getAssetDetail',
      'getMonthlyInvestments',
      'getGoalProgress',
      'getAllocationDrift',
    ]),
    rules: [...SHARED_RULES, '8c'],
  },
  {
    id: 'cashflow',
    label: 'Cashflow',
    focus:
      'money going out — spending by category, loans and their cost, and SIP and EMI commitments coming up',
    tools: tools([
      'getExpenseBreakdown',
      'listExpenses',
      'getLoanSummary',
      'getUpcomingCommitments',
      'getMonthlyInvestments',
    ]),
    rules: [...SHARED_RULES, '6'],
  },
  {
    id: 'markets',
    label: 'Markets',
    focus:
      'conditions outside the records — benchmark trends, news sentiment, fund screens and comparisons, and the decision journal',
    tools: tools([
      'getMarketTrends',
      'getNewsSentiment',
      'screenFunds',
      'compareFunds',
      'getDecisionJournal',
      'getAllocationDrift',
    ]),
    rules: [...SHARED_RULES, '8a', '8c', '8d', '8f', '8i'],
  },
];

export const SPECIALISTS_BY_ID: ReadonlyMap<string, Specialist> = new Map(
  SPECIALISTS.map(specialist => [specialist.id, specialist])
);
