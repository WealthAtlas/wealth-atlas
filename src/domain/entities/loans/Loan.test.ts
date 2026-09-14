import { describe, expect, it } from 'vitest';
import { Currency } from '../shared/Currency';
import { Frequency } from '../shared/Frequency';
import { IEMI } from './EMI';
import { IPayment } from './Payment';
import { ILoan, Loan } from './Loan';

const BASE: ILoan = {
  id: 1,
  name: 'Home Loan',
  description: '',
  principalAmount: 10000,
  currency: Currency.INR,
  startDate: new Date('2020-01-01'),
};

const emi = (overrides: Partial<IEMI> = {}): IEMI => ({
  id: 7,
  loanId: 1,
  name: 'Home EMI',
  amount: 1000,
  frequency: Frequency.MONTHLY,
  startDate: new Date('2020-01-01'),
  endDate: new Date('2020-12-01'),
  ...overrides,
});

const payment = (overrides: Partial<IPayment>): IPayment => ({
  id: undefined,
  loanId: 1,
  description: 'Home EMI',
  date: new Date('2020-01-01'),
  amount: 1000,
  ...overrides,
});

describe('Loan cost of borrowing', () => {
  // The bug this guards against: getIRR()/getTotalAmount() used to splice
  // already-materialized `payments` (which only exist up to however far the
  // scheduler has run) together with `getPendingOccurrences()` (which resumes
  // from that same generation state), so the figure quietly changed as more
  // instalments were auto-generated over time even though nothing about the
  // loan's terms did.
  it('totals the full EMI schedule the same way whether none, some, or all instalments have been materialized', () => {
    const noneGenerated = new Loan({ ...BASE, payments: [], emis: [emi()] });
    const someGenerated = new Loan({
      ...BASE,
      payments: [
        payment({ emiId: 7, date: new Date('2020-01-01') }),
        payment({ emiId: 7, date: new Date('2020-02-01') }),
        payment({ emiId: 7, date: new Date('2020-03-01') }),
      ],
      emis: [emi()],
    });

    // 12 monthly instalments of 1000, Jan through Dec inclusive.
    expect(noneGenerated.getTotalAmount()).toBe(12000);
    expect(someGenerated.getTotalAmount()).toBe(12000);
    expect(noneGenerated.getInterestAmount()).toBe(2000);
    expect(someGenerated.getInterestAmount()).toBe(2000);
    expect(someGenerated.getIRR()).toBeCloseTo(noneGenerated.getIRR(), 6);
  });

  it('still counts a payment recorded outside any EMI schedule', () => {
    const withPrepayment = new Loan({
      ...BASE,
      payments: [payment({ emiId: undefined, date: new Date('2020-06-15'), amount: 500 })],
      emis: [emi()],
    });

    // The schedule knows nothing about a manual prepayment, so it has to come
    // from the actual record rather than from `getAllOccurrences()`.
    expect(withPrepayment.getTotalAmount()).toBe(12500);
  });

  it('reports what has actually been paid separately from the full schedule', () => {
    const loan = new Loan({
      ...BASE,
      payments: [payment({ emiId: 7, date: new Date('2020-01-01') })],
      emis: [emi()],
    });

    expect(loan.getPaidAmount()).toBe(1000);
    expect(loan.getTotalAmount()).toBe(12000);
    expect(loan.getOutstandingAmount()).toBe(11000);
  });

  it('expresses total interest as a share of principal, not annualised', () => {
    const loan = new Loan({ ...BASE, payments: [], emis: [emi()] });

    // 2000 interest on a 10000 principal, over the whole life of the loan.
    expect(loan.getOverallInterestRate()).toBeCloseTo(20, 6);
  });

  it('returns zero IRR when the schedule repays exactly the principal', () => {
    const loan = new Loan({
      ...BASE,
      payments: [],
      emis: [emi({ amount: 833.33, endDate: new Date('2020-12-01') })],
    });
    // 12 * 833.33 ~= 10000, so there's effectively no interest.
    expect(loan.getOverallInterestRate()).toBeCloseTo(0, 0);
    expect(loan.getIRR()).toBeCloseTo(0, 0);
  });
});
