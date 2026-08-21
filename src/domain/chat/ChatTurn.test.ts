import { describe, expect, it } from 'vitest';
import { parseAssistantTurn } from './ChatTurn';

const KNOWN = new Set(['getPortfolioSummary', 'getExpenseBreakdown']);

describe('parseAssistantTurn', () => {
  it('reads a reply', () => {
    const { turn, warnings } = parseAssistantTurn({ reply: 'Your net worth is INR 10.' }, KNOWN);

    expect(turn.reply).toBe('Your net worth is INR 10.');
    expect(turn.toolCalls).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('reads tool calls with their arguments', () => {
    const { turn, warnings } = parseAssistantTurn(
      { toolCalls: [{ name: 'getExpenseBreakdown', args: { months: 3 } }] },
      KNOWN
    );

    expect(turn.toolCalls).toEqual([{ name: 'getExpenseBreakdown', args: { months: 3 } }]);
    expect(warnings).toEqual([]);
  });

  it('defaults missing arguments to an empty object', () => {
    const { turn } = parseAssistantTurn({ toolCalls: [{ name: 'getPortfolioSummary' }] }, KNOWN);

    expect(turn.toolCalls[0].args).toEqual({});
  });

  it('keeps several tool calls in one turn', () => {
    const { turn } = parseAssistantTurn(
      {
        toolCalls: [{ name: 'getPortfolioSummary' }, { name: 'getExpenseBreakdown' }],
      },
      KNOWN
    );

    expect(turn.toolCalls.map(call => call.name)).toEqual([
      'getPortfolioSummary',
      'getExpenseBreakdown',
    ]);
  });

  // A hallucinated tool name must not reach the registry, where it would be
  // silently skipped and leave the model waiting on a result that never comes.
  it('drops an unknown tool name and says so', () => {
    const { turn, warnings } = parseAssistantTurn(
      { toolCalls: [{ name: 'getCryptoPrices' }] },
      KNOWN
    );

    expect(turn.toolCalls).toEqual([]);
    expect(warnings.join(' ')).toContain('getCryptoPrices');
  });

  it('drops a tool call with no name', () => {
    const { turn, warnings } = parseAssistantTurn({ toolCalls: [{ args: {} }] }, KNOWN);

    expect(turn.toolCalls).toEqual([]);
    expect(warnings.join(' ')).toContain('no name');
  });

  it('keeps the valid tool calls when one of them is bad', () => {
    const { turn, warnings } = parseAssistantTurn(
      { toolCalls: [{ name: 'nope' }, { name: 'getPortfolioSummary' }] },
      KNOWN
    );

    expect(turn.toolCalls.map(call => call.name)).toEqual(['getPortfolioSummary']);
    expect(warnings).toHaveLength(1);
  });

  it('ignores a toolCalls that is not a list', () => {
    const { turn, warnings } = parseAssistantTurn(
      { toolCalls: 'getPortfolioSummary', reply: 'hello' },
      KNOWN
    );

    expect(turn.toolCalls).toEqual([]);
    expect(turn.reply).toBe('hello');
    expect(warnings.join(' ')).toContain('not a list');
  });

  it('reports a response that is not an object', () => {
    const { turn, warnings } = parseAssistantTurn('just text', KNOWN);

    expect(turn.toolCalls).toEqual([]);
    expect(turn.reply).toBeUndefined();
    expect(warnings.join(' ')).toContain('did not return a JSON object');
  });

  it('treats a blank reply as no reply, and reports it', () => {
    const { turn, warnings } = parseAssistantTurn({ reply: '   ' }, KNOWN);

    expect(turn.reply).toBeUndefined();
    expect(warnings.join(' ')).toContain('without an answer');
  });

  it('carries proposed operations through unparsed', () => {
    const { turn } = parseAssistantTurn({ operations: [{ op: 'addExpense', amount: 100 }] }, KNOWN);

    expect(turn.operations).toEqual([{ op: 'addExpense', amount: 100 }]);
  });

  it('trims a reply', () => {
    const { turn } = parseAssistantTurn({ reply: '  spaced out  ' }, KNOWN);

    expect(turn.reply).toBe('spaced out');
  });
});
