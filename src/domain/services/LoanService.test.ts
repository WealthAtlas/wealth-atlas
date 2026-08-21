import { describe, expect, it } from 'vitest';
import { IEMI } from '../entities/loans/EMI';
import { ILoan, Loan } from '../entities/loans/Loan';
import { IPayment } from '../entities/loans/Payment';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { Frequency } from '../entities/shared/Frequency';
import { computeLoanPortfolioTotals } from './LoanService';

const USD_RATE = 88;

function converter(rates: Partial<Record<Currency, number>> = {}): CurrencyConverter {
  return new CurrencyConverter(
    Currency.INR,
    new Map(Object.entries(rates) as [Currency, number][])
  );
}

/**
 * A loan whose totals are stable over time: the schedule starts and ends in the
 * past, so the occurrences it projects never change as the suite runs.
 */
function loan(
  overrides: {
    currency?: Currency;
    principalAmount?: number;
    emiAmount?: number;
    payments?: IPayment[];
  } = {}
): Loan {
  const {
    currency = Currency.INR,
    principalAmount = 100000,
    emiAmount = 500,
    payments = [],
  } = overrides;

  const base: ILoan = {
    id: 1,
    name: 'Test Loan',
    description: '',
    principalAmount,
    currency,
    startDate: new Date('2020-01-01'),
  };
  const emi: IEMI = {
    id: 1,
    loanId: 1,
    name: 'EMI',
    amount: emiAmount,
    frequency: Frequency.MONTHLY,
    startDate: new Date('2020-01-01'),
    endDate: new Date('2020-04-01'),
    lastGeneratedDate: undefined,
  };
  return new Loan({ ...base, payments, emis: [emi] });
}

function payment(amount: number): IPayment {
  return {
    id: 1,
    loanId: 1,
    emiId: 1,
    date: new Date('2020-02-01'),
    amount,
    description: '',
  };
}

describe('computeLoanPortfolioTotals', () => {
  it('returns zeroed totals for no loans', () => {
    const totals = computeLoanPortfolioTotals([], converter());

    expect(totals.totalOutstanding).toBe(0);
    expect(totals.totalPaid).toBe(0);
    expect(totals.totalInterestAmount).toBe(0);
    expect(totals.totalLoans).toBe(0);
    expect(totals.unratedCurrencies).toEqual([]);
  });

  it('reports each loan total in the base currency', () => {
    const single = loan();
    const totals = computeLoanPortfolioTotals([single], converter());

    expect(totals.totalOutstanding).toBe(single.getOutstandingAmount());
    expect(totals.totalPaid).toBe(single.getPaidAmount());
    expect(totals.totalInterestAmount).toBe(single.getInterestAmount());
    expect(totals.currency).toBe(Currency.INR);
  });

  it('counts every loan', () => {
    const totals = computeLoanPortfolioTotals([loan(), loan()], converter());

    expect(totals.totalLoans).toBe(2);
  });

  it('sums payments made across loans', () => {
    const paid = loan({ payments: [payment(300)] });
    const totals = computeLoanPortfolioTotals([paid], converter());

    expect(totals.totalPaid).toBe(300);
  });

  it('converts a loan from its own currency before summing', () => {
    const usd = loan({ currency: Currency.USD });
    const totals = computeLoanPortfolioTotals([usd], converter({ [Currency.USD]: USD_RATE }));

    expect(totals.totalOutstanding).toBeCloseTo(usd.getOutstandingAmount() * USD_RATE, 1);
    expect(totals.unratedCurrencies).toEqual([]);
  });

  // A loan that converts to 0 quietly *inflates* net worth, so the missing rate
  // has to be reported rather than left to look like a paid-off loan.
  it('names currencies with no rate, whose loans counted as zero', () => {
    const totals = computeLoanPortfolioTotals([loan({ currency: Currency.USD })], converter());

    expect(totals.totalOutstanding).toBe(0);
    expect(totals.unratedCurrencies).toEqual([Currency.USD]);
  });
});
