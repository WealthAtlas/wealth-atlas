import { describe, expect, it } from 'vitest';
import { Currency } from '../entities/shared/Currency';
import { ImportContext } from './ImportContextBuilder';
import { validateImportPlan } from './ImportPlanValidator';
import { normalizeSource } from './SourceNormalizer';

const SOURCE = [
  'symbol,trade_date,trade_type,quantity,price',
  'INFY,2024-03-15,buy,10,14507.50',
  'TCS,2024-03-18,sell,5,19451.00',
  'WIPRO,2024-03-20,buy,20,9000.00',
].join('\n');

const { numericTokens } = normalizeSource(SOURCE);

const CONTEXT: ImportContext = {
  assets: [
    { id: 12, name: 'Infosys', category: 'Stock', currency: 'INR', totalQty: 30 },
    { id: 13, name: 'TCS', category: 'Stock', currency: 'INR', totalQty: 10 },
  ],
  loans: [{ id: 5, name: 'Home Loan', currency: 'INR' }],
  expenseCategories: ['Groceries'],
  existingTransactions: [{ assetId: 12, date: '2024-01-01', totalAmount: 5000 }],
  existingExpenses: [{ date: '2024-02-01', amount: 450, description: 'Weekly shop' }],
};

function validate(operations: unknown[], sourceSummary = 'a tradebook') {
  return validateImportPlan({
    raw: { sourceSummary, operations },
    context: CONTEXT,
    numericTokens,
  });
}

describe('validateImportPlan — response shape', () => {
  it('rejects a non-object response', () => {
    const plan = validateImportPlan({ raw: 'nope', context: CONTEXT, numericTokens });
    expect(plan.operations).toEqual([]);
    expect(plan.warnings[0]).toContain('did not return a JSON object');
  });

  it('rejects a response with no operations array', () => {
    const plan = validateImportPlan({ raw: { foo: 1 }, context: CONTEXT, numericTokens });
    expect(plan.operations).toEqual([]);
    expect(plan.warnings[0]).toContain('no "operations" array');
  });

  it('keeps the source summary', () => {
    expect(validate([]).sourceSummary).toBe('a tradebook');
  });

  it('drops an unknown operation type and says so', () => {
    const plan = validate([{ op: 'launchRocket' }]);
    expect(plan.operations).toEqual([]);
    expect(plan.warnings[0]).toContain('launchRocket');
  });
});

describe('validateImportPlan — provenance', () => {
  it('accepts a transaction whose numbers are in the source', () => {
    const plan = validate([
      {
        op: 'addTransaction',
        assetId: 12,
        type: 'buy',
        quantity: 10,
        totalAmount: 14507.5,
        date: '2024-03-15',
      },
    ]);

    expect(plan.operations).toHaveLength(1);
    expect(plan.operations[0].flags).toEqual([]);
  });

  it('flags a hallucinated amount as unverified rather than dropping it', () => {
    const plan = validate([
      {
        op: 'addTransaction',
        assetId: 12,
        type: 'buy',
        quantity: 10,
        totalAmount: 15407.5, // transposed digits
        date: '2024-03-15',
      },
    ]);

    expect(plan.operations).toHaveLength(1);
    expect(plan.operations[0].flags).toContain('unverified');
    expect(plan.operations[0].warnings.join(' ')).toContain('15407.5');
  });

  it('flags a hallucinated quantity', () => {
    const plan = validate([
      {
        op: 'addTransaction',
        assetId: 12,
        type: 'buy',
        quantity: 77,
        totalAmount: 14507.5,
        date: '2024-03-15',
      },
    ]);

    expect(plan.operations[0].flags).toContain('unverified');
  });

  it('flags an invented expense amount', () => {
    const plan = validate([
      {
        op: 'addExpense',
        amount: 12345.67,
        currency: 'INR',
        date: '2024-03-01',
        category: 'Groceries',
        isEssential: true,
        description: 'Shop',
      },
    ]);

    expect(plan.operations[0].flags).toContain('unverified');
  });
});

describe('validateImportPlan — referential integrity', () => {
  it('drops a transaction pointing at an asset that does not exist', () => {
    const plan = validate([
      { op: 'addTransaction', assetId: 999, type: 'buy', totalAmount: 9000, date: '2024-03-20' },
    ]);

    expect(plan.operations).toEqual([]);
    expect(plan.warnings[0]).toContain('999');
  });

  it('drops a transaction whose assetRef is never created', () => {
    const plan = validate([
      {
        op: 'addTransaction',
        assetRef: 'ghost',
        type: 'buy',
        totalAmount: 9000,
        date: '2024-03-20',
      },
    ]);

    expect(plan.operations).toEqual([]);
    expect(plan.warnings[0]).toContain('ghost');
  });

  it('resolves an assetRef created later in the same plan', () => {
    const plan = validate([
      {
        op: 'addTransaction',
        assetRef: 'wipro',
        type: 'buy',
        quantity: 20,
        totalAmount: 9000,
        date: '2024-03-20',
      },
      {
        op: 'createAsset',
        ref: 'wipro',
        name: 'Wipro',
        category: 'Stock',
        currency: 'INR',
        valueModel: 'MARKET_BASED',
      },
    ]);

    expect(plan.operations).toHaveLength(2);
    expect(plan.warnings).toEqual([]);
  });

  it('drops a delete pointing at a missing asset', () => {
    const plan = validate([{ op: 'deleteAsset', assetId: 999 }]);
    expect(plan.operations).toEqual([]);
  });

  it('drops a loan payment for an unknown loan', () => {
    const plan = validate([{ op: 'addLoanPayment', loanId: 99, amount: 9000, date: '2024-03-20' }]);
    expect(plan.operations).toEqual([]);
  });
});

describe('validateImportPlan — enum coercion', () => {
  it('coerces an unknown asset category to Other and warns', () => {
    const plan = validate([
      {
        op: 'createAsset',
        ref: 'x',
        name: 'Mystery',
        category: 'Interstellar Bonds',
        currency: 'INR',
        valueModel: 'MARKET_BASED',
      },
    ]);

    const op = plan.operations[0];
    expect(op.operation).toMatchObject({ category: 'Other' });
    expect(op.warnings.join(' ')).toContain('Interstellar Bonds');
  });

  it('matches a known category case-insensitively without warning', () => {
    const plan = validate([
      {
        op: 'createAsset',
        ref: 'x',
        name: 'Fund',
        category: 'mutual funds',
        currency: 'INR',
        valueModel: 'MARKET_BASED',
      },
    ]);

    expect(plan.operations[0].operation).toMatchObject({ category: 'Mutual Funds' });
    expect(plan.operations[0].warnings).toEqual([]);
  });

  it('coerces a currency symbol back to a code', () => {
    const plan = validate([
      {
        op: 'createAsset',
        ref: 'x',
        name: 'Fund',
        category: 'Stock',
        currency: '₹',
        valueModel: 'MARKET_BASED',
      },
    ]);

    expect(plan.operations[0].operation).toMatchObject({ currency: Currency.INR });
  });

  it('defaults an unknown valuation model to MARKET_BASED', () => {
    const plan = validate([
      {
        op: 'createAsset',
        ref: 'x',
        name: 'Fund',
        category: 'Stock',
        currency: 'INR',
        valueModel: 'VIBES_BASED',
      },
    ]);

    expect(plan.operations[0].operation).toMatchObject({ valueModel: 'MARKET_BASED' });
  });

  it('drops a fixed-income asset with no interest rate, via the shared validator', () => {
    const plan = validate([
      {
        op: 'createAsset',
        ref: 'x',
        name: 'FD',
        category: 'Fixed Deposit',
        currency: 'INR',
        valueModel: 'FIXED_INCOME',
      },
    ]);

    expect(plan.operations).toEqual([]);
    expect(plan.warnings[0]).toContain('interestRate');
  });
});

describe('validateImportPlan — dates and signs', () => {
  it('drops a transaction with an unparseable date', () => {
    const plan = validate([
      { op: 'addTransaction', assetId: 12, type: 'buy', totalAmount: 14507.5, date: '15/03/2024' },
    ]);

    expect(plan.operations).toEqual([]);
    expect(plan.warnings[0]).toContain('15/03/2024');
  });

  it('warns about a far-future date but keeps the operation', () => {
    const plan = validate([
      { op: 'addTransaction', assetId: 12, type: 'buy', totalAmount: 14507.5, date: '2099-01-01' },
    ]);

    expect(plan.operations).toHaveLength(1);
    expect(plan.operations[0].warnings.join(' ')).toContain('future');
  });

  it('normalises a negative quantity to positive and warns', () => {
    const plan = validate([
      {
        op: 'addTransaction',
        assetId: 13,
        type: 'sell',
        quantity: -5,
        totalAmount: 19451,
        date: '2024-03-18',
      },
    ]);

    expect(plan.operations[0].operation).toMatchObject({ quantity: 5 });
    expect(plan.operations[0].warnings.join(' ')).toContain('direction');
  });

  it('drops a transaction with a non-positive total', () => {
    const plan = validate([
      { op: 'addTransaction', assetId: 12, type: 'buy', totalAmount: 0, date: '2024-03-15' },
    ]);

    expect(plan.operations).toEqual([]);
  });

  it('rejects a transaction type outside buy/sell', () => {
    const plan = validate([
      {
        op: 'addTransaction',
        assetId: 12,
        type: 'dividend',
        totalAmount: 14507.5,
        date: '2024-03-15',
      },
    ]);

    expect(plan.operations).toEqual([]);
  });
});

describe('validateImportPlan — duplicates and deletes', () => {
  it('flags a transaction that already exists', () => {
    const context: ImportContext = {
      ...CONTEXT,
      existingTransactions: [{ assetId: 12, date: '2024-03-15', totalAmount: 14507.5 }],
    };

    const plan = validateImportPlan({
      raw: {
        operations: [
          {
            op: 'addTransaction',
            assetId: 12,
            type: 'buy',
            quantity: 10,
            totalAmount: 14507.5,
            date: '2024-03-15',
          },
        ],
      },
      context,
      numericTokens,
    });

    expect(plan.operations[0].flags).toContain('duplicate');
  });

  it('flags a duplicate expense on date, amount and description', () => {
    const plan = validate([
      {
        op: 'addExpense',
        amount: 450,
        currency: 'INR',
        date: '2024-02-01',
        category: 'Groceries',
        isEssential: true,
        description: 'weekly shop',
      },
    ]);

    expect(plan.operations[0].flags).toContain('duplicate');
  });

  it('does not flag a same-day transaction with a different amount', () => {
    const plan = validate([
      {
        op: 'addTransaction',
        assetId: 13,
        type: 'sell',
        quantity: 5,
        totalAmount: 19451,
        date: '2024-03-18',
      },
    ]);

    expect(plan.operations[0].flags).not.toContain('duplicate');
  });

  it('flags every delete as destructive', () => {
    const plan = validate([
      { op: 'deleteAsset', assetId: 12 },
      { op: 'deleteTransaction', investmentId: 7 },
      { op: 'deleteExpense', expenseId: 8 },
      { op: 'deleteLoanPayment', paymentId: 9 },
    ]);

    expect(plan.operations).toHaveLength(4);
    expect(plan.operations.every(op => op.flags.includes('destructive'))).toBe(true);
  });
});
