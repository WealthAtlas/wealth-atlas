import { describe, expect, it } from 'vitest';
import { IAsset } from '../entities/assets/Asset';
import { AssetCategory } from '../entities/assets/AssetCategory';
import { IDecisionEntry } from '../entities/journal/DecisionEntry';
import { IMemory, MemoryKind, MEMORY_TEXT_LIMIT } from '../entities/memory/Memory';
import { IInvestment, InvestmentType } from '../entities/assets/Investment';
import { ValueModel } from '../entities/assets/ValueModel';
import { IExpense } from '../entities/expenses/Expense';
import { ILoan } from '../entities/loans/Loan';
import { IPayment } from '../entities/loans/Payment';
import { Currency } from '../entities/shared/Currency';
import {
  validateAsset,
  validateDecisionEntry,
  validateExpense,
  validateInvestment,
  validateLoan,
  validateMemory,
  validatePayment,
  validateTargetAllocation,
} from './EntityValidators';
import { issueFor, isValid } from './ValidationIssue';

const MARKET_ASSET: IAsset = {
  id: 1,
  name: 'Nifty 50 Index',
  description: '',
  category: 'Index Fund',
  currency: Currency.INR,
  valueModel: ValueModel.MARKET_BASED,
  interestRate: undefined,
  maturityDate: undefined,
  maturityAmount: undefined,
  manualValue: undefined,
  manualValueUpdatedAt: undefined,
  script: undefined,
  scriptValue: undefined,
  scriptValueUpdatedAt: undefined,
};

describe('validateAsset', () => {
  it('accepts a well-formed market-based asset', () => {
    expect(validateAsset(MARKET_ASSET)).toEqual([]);
  });

  it('rejects a blank or whitespace-only name', () => {
    const issues = validateAsset({ ...MARKET_ASSET, name: '   ' });
    expect(issueFor(issues, 'name')).toBe('Name is required');
  });

  it('rejects a currency that is not a supported code', () => {
    const issues = validateAsset({ ...MARKET_ASSET, currency: '₹' as Currency });
    expect(issueFor(issues, 'currency')).toContain('Unsupported currency');
  });

  it('requires an interest rate for fixed income assets', () => {
    const issues = validateAsset({ ...MARKET_ASSET, valueModel: ValueModel.FIXED_INCOME });
    expect(issueFor(issues, 'interestRate')).toBeDefined();

    const withRate = validateAsset({
      ...MARKET_ASSET,
      valueModel: ValueModel.FIXED_INCOME,
      interestRate: 7.5,
    });
    expect(isValid(withRate)).toBe(true);
  });

  it('requires both maturity date and amount for maturity-based assets', () => {
    const issues = validateAsset({ ...MARKET_ASSET, valueModel: ValueModel.MATURITY_BASED });
    expect(issueFor(issues, 'maturityDate')).toBeDefined();
    expect(issueFor(issues, 'maturityAmount')).toBeDefined();

    const complete = validateAsset({
      ...MARKET_ASSET,
      valueModel: ValueModel.MATURITY_BASED,
      maturityDate: new Date('2030-01-01'),
      maturityAmount: 250_000,
    });
    expect(isValid(complete)).toBe(true);
  });

  it('does not demand an interest rate from a market-based asset', () => {
    expect(issueFor(validateAsset(MARKET_ASSET), 'interestRate')).toBeUndefined();
  });
});

describe('validateInvestment', () => {
  const BUY: IInvestment = {
    id: undefined,
    assetId: 1,
    type: InvestmentType.BUY,
    quantity: 10,
    totalAmount: 1000,
    date: new Date('2024-01-15'),
  };

  it('accepts a well-formed transaction', () => {
    expect(validateInvestment(BUY)).toEqual([]);
  });

  it('rejects a non-positive amount', () => {
    expect(issueFor(validateInvestment({ ...BUY, totalAmount: 0 }), 'totalAmount')).toBeDefined();
  });

  it('rejects a negative quantity and points at the sell type instead', () => {
    const issues = validateInvestment({ ...BUY, quantity: -10 });
    expect(issueFor(issues, 'quantity')).toContain('sell');
  });

  it('accepts a sell with positive values', () => {
    expect(validateInvestment({ ...BUY, type: InvestmentType.SELL })).toEqual([]);
  });

  it('rejects an invalid date', () => {
    expect(issueFor(validateInvestment({ ...BUY, date: new Date('x') }), 'date')).toBeDefined();
  });

  it('requires an owning asset', () => {
    expect(issueFor(validateInvestment({ ...BUY, assetId: 0 }), 'assetId')).toBeDefined();
  });
});

describe('validateExpense', () => {
  const EXPENSE: IExpense = {
    id: undefined,
    amount: 450,
    currency: Currency.INR,
    date: new Date('2024-02-01'),
    category: 'Groceries',
    isEssential: true,
    description: 'Weekly shop',
  };

  it('accepts a well-formed expense', () => {
    expect(validateExpense(EXPENSE)).toEqual([]);
  });

  it('rejects a zero amount', () => {
    expect(issueFor(validateExpense({ ...EXPENSE, amount: 0 }), 'amount')).toBeDefined();
  });

  it('rejects a legacy symbol currency', () => {
    const issues = validateExpense({ ...EXPENSE, currency: '$' as Currency });
    expect(issueFor(issues, 'currency')).toContain('Unsupported currency');
  });

  it('requires a category', () => {
    expect(issueFor(validateExpense({ ...EXPENSE, category: '' }), 'category')).toBeDefined();
  });
});

describe('validateLoan', () => {
  const LOAN: ILoan = {
    id: undefined,
    name: 'Home Loan',
    description: '',
    principalAmount: 5_000_000,
    currency: Currency.INR,
    startDate: new Date('2022-06-01'),
  };

  it('accepts a well-formed loan', () => {
    expect(validateLoan(LOAN)).toEqual([]);
  });

  it('rejects a non-positive principal', () => {
    expect(
      issueFor(validateLoan({ ...LOAN, principalAmount: 0 }), 'principalAmount')
    ).toBeDefined();
  });

  it('rejects a missing name', () => {
    expect(issueFor(validateLoan({ ...LOAN, name: '' }), 'name')).toBeDefined();
  });
});

describe('validatePayment', () => {
  const PAYMENT: IPayment = {
    id: undefined,
    loanId: 3,
    description: 'EMI',
    date: new Date('2024-03-05'),
    amount: 42_000,
  };

  it('accepts a well-formed payment', () => {
    expect(validatePayment(PAYMENT)).toEqual([]);
  });

  it('requires an owning loan', () => {
    expect(issueFor(validatePayment({ ...PAYMENT, loanId: 0 }), 'loanId')).toBeDefined();
  });

  it('rejects a non-positive amount', () => {
    expect(issueFor(validatePayment({ ...PAYMENT, amount: -1 }), 'amount')).toBeDefined();
  });
});

describe('validateTargetAllocation', () => {
  it('accepts an empty allocation, which is the state of having no policy', () => {
    expect(validateTargetAllocation([])).toEqual([]);
  });

  it('accepts targets that add up to 100', () => {
    const issues = validateTargetAllocation([
      { category: AssetCategory.STOCK, targetPercent: 60, bandPercent: 5 },
      { category: AssetCategory.DEBT, targetPercent: 40 },
    ]);

    expect(issues).toEqual([]);
  });

  it('rejects targets adding up to more than 100, which cannot be held', () => {
    const issues = validateTargetAllocation([
      { category: AssetCategory.STOCK, targetPercent: 80 },
      { category: AssetCategory.DEBT, targetPercent: 50 },
    ]);

    expect(issues.some(issue => issue.message.includes('more than 100%'))).toBe(true);
  });

  it('allows an allocation that covers less than the whole portfolio', () => {
    // A policy over part of the portfolio is a real choice, not an error: the
    // rest is simply undirected, which `untargeted` reports.
    const issues = validateTargetAllocation([{ category: AssetCategory.STOCK, targetPercent: 50 }]);

    expect(issues).toEqual([]);
  });

  it('rejects a category the app does not know', () => {
    const issues = validateTargetAllocation([{ category: 'Beanie Babies', targetPercent: 10 }]);

    expect(issues).toEqual([
      { field: 'category', message: '"Beanie Babies" is not an asset category' },
    ]);
  });

  it('rejects the same category twice, which would make the drift ambiguous', () => {
    const issues = validateTargetAllocation([
      { category: AssetCategory.GOLD, targetPercent: 10 },
      { category: AssetCategory.GOLD, targetPercent: 20 },
    ]);

    expect(issues.some(issue => issue.message.includes('more than one target'))).toBe(true);
  });

  it('rejects a percentage outside 0-100', () => {
    expect(
      validateTargetAllocation([{ category: AssetCategory.GOLD, targetPercent: -1 }])
    ).toHaveLength(1);
    expect(
      validateTargetAllocation([{ category: AssetCategory.GOLD, targetPercent: 101 }])
    ).toHaveLength(2); // out of range, and over the 100% total
  });

  it('accepts a deliberate zero target', () => {
    const issues = validateTargetAllocation([
      { category: AssetCategory.CRYPTOCURRENCY, targetPercent: 0 },
    ]);

    expect(issues).toEqual([]);
  });

  it('rejects an unusable band', () => {
    const issues = validateTargetAllocation([
      { category: AssetCategory.GOLD, targetPercent: 10, bandPercent: 200 },
    ]);

    expect(issues.some(issue => issue.field === 'bandPercent')).toBe(true);
  });
});

describe('validateDecisionEntry', () => {
  function entry(overrides: Partial<IDecisionEntry> = {}): IDecisionEntry {
    return {
      id: undefined,
      createdAt: new Date('2026-08-20T00:00:00.000Z'),
      category: AssetCategory.GOLD,
      action: 'sell',
      status: 'acted',
      amount: 150000,
      currency: Currency.INR,
      rationale: 'Well over target after the rally.',
      evidence: {},
      reviewedAt: undefined,
      reviewNote: undefined,
      ...overrides,
    };
  }

  it('accepts a complete entry', () => {
    expect(validateDecisionEntry(entry())).toEqual([]);
  });

  it('requires a rationale, which is the whole point of the record', () => {
    // Without it the row is a trade log line, and a trade log cannot be reviewed
    // for whether the thinking held up.
    const issues = validateDecisionEntry(entry({ rationale: '   ' }));

    expect(issueFor(issues, 'rationale')).toContain('Say why');
  });

  it('rejects a category the app does not know', () => {
    expect(
      issueFor(validateDecisionEntry(entry({ category: 'Beanie Babies' })), 'category')
    ).toContain('not an asset category');
  });

  it('rejects an unknown action or status', () => {
    expect(
      issueFor(validateDecisionEntry(entry({ action: 'yolo' as never })), 'action')
    ).toBeDefined();
    expect(
      issueFor(validateDecisionEntry(entry({ status: 'maybe' as never })), 'status')
    ).toBeDefined();
  });

  it('requires an amount once a directional decision was acted on', () => {
    const issues = validateDecisionEntry(entry({ status: 'acted', amount: undefined }));

    expect(issueFor(issues, 'amount')).toContain('how much was moved');
  });

  it('does not require an amount for a hold, or for one not acted on', () => {
    expect(
      isValid(validateDecisionEntry(entry({ action: 'hold', status: 'acted', amount: undefined })))
    ).toBe(true);
    expect(isValid(validateDecisionEntry(entry({ status: 'declined', amount: undefined })))).toBe(
      true
    );
  });

  it('rejects a non-positive amount', () => {
    expect(issueFor(validateDecisionEntry(entry({ amount: 0 })), 'amount')).toBeDefined();
    expect(issueFor(validateDecisionEntry(entry({ amount: -5 })), 'amount')).toBeDefined();
  });

  it('rejects an unusable date', () => {
    expect(
      issueFor(validateDecisionEntry(entry({ createdAt: new Date('nope') })), 'createdAt')
    ).toBeDefined();
  });
});

describe('validateMemory', () => {
  const now = new Date('2026-08-23T00:00:00Z');
  const valid: IMemory = {
    id: 1,
    kind: MemoryKind.Context,
    text: 'Can invest about 50,000 a month.',
    source: 'assistant',
    createdAt: now,
    updatedAt: now,
  };

  it('accepts a well-formed memory', () => {
    expect(validateMemory(valid)).toEqual([]);
  });

  it('rejects an empty statement', () => {
    expect(issueFor(validateMemory({ ...valid, text: '   ' }), 'text')).toBeDefined();
  });

  // A memory is one statement, and the whole set is pasted into every system
  // prompt: a paragraph both stores two facts in one row and crowds out the
  // rules around it.
  it('rejects a statement longer than the limit but accepts one at it', () => {
    expect(
      issueFor(validateMemory({ ...valid, text: 'x'.repeat(MEMORY_TEXT_LIMIT + 1) }), 'text')
    ).toBeDefined();
    expect(validateMemory({ ...valid, text: 'x'.repeat(MEMORY_TEXT_LIMIT) })).toEqual([]);
  });

  it('rejects a kind the app does not know', () => {
    const memory = { ...valid, kind: 'risk' as unknown as MemoryKind };
    expect(issueFor(validateMemory(memory), 'kind')).toBeDefined();
  });

  it('rejects an unrecognised source', () => {
    const memory = { ...valid, source: 'model' as unknown as IMemory['source'] };
    expect(issueFor(validateMemory(memory), 'source')).toBeDefined();
  });

  it('rejects dates that did not survive the trip', () => {
    const broken = new Date('nonsense');
    expect(issueFor(validateMemory({ ...valid, createdAt: broken }), 'createdAt')).toBeDefined();
    expect(issueFor(validateMemory({ ...valid, updatedAt: broken }), 'updatedAt')).toBeDefined();
  });
});
