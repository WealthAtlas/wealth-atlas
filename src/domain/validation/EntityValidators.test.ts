import { describe, expect, it } from 'vitest';
import { IAsset } from '../entities/assets/Asset';
import { IInvestment, InvestmentType } from '../entities/assets/Investment';
import { ValueModel } from '../entities/assets/ValueModel';
import { IExpense } from '../entities/expenses/Expense';
import { ILoan } from '../entities/loans/Loan';
import { IPayment } from '../entities/loans/Payment';
import { Currency } from '../entities/shared/Currency';
import {
  validateAsset,
  validateExpense,
  validateInvestment,
  validateLoan,
  validatePayment,
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
