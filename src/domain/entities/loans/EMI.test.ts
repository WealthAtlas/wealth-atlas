import { describe, expect, it } from 'vitest';
import { Frequency } from '../shared/Frequency';
import { EMI } from './EMI';

const emi = (id: number | undefined) =>
  new EMI({
    id,
    loanId: 3,
    name: 'Home EMI',
    amount: 1000,
    frequency: Frequency.MONTHLY,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-05-01'),
  });

describe('EMI occurrences', () => {
  // The payment cascade is invisible to tsc: emiId is optional, so an omitted
  // one compiles and only shows up as payments outliving the EMI that made them.
  it('stamps the generating EMI on every payment it produces', () => {
    const payments = emi(7).getPendingOccurrences(new Date('2026-04-15'));

    expect(payments).not.toHaveLength(0);
    expect(payments.every(payment => payment.emiId === 7)).toBe(true);
  });

  it('stamps the generating EMI on the next single occurrence', () => {
    expect(emi(7).getNextOccurrenceData()?.emiId).toBe(7);
  });

  it('carries the loan and the EMI name onto each payment', () => {
    const [payment] = emi(7).getPendingOccurrences(new Date('2026-02-15'));

    expect(payment.loanId).toBe(3);
    expect(payment.description).toBe('Home EMI');
    expect(payment.amount).toBe(1000);
  });

  it('leaves the reference unset for an unsaved EMI', () => {
    expect(emi(undefined).getNextOccurrenceData()?.emiId).toBeUndefined();
  });

  // shouldAdd is shared with SIP, so the inclusive end date is asserted on both
  // sides: an EMI schedule ending on its last payment date must generate it, or
  // a loan quietly finishes one instalment short of what the user entered.
  it('generates the payment falling on the end date', () => {
    const endDate = new Date('2020-04-01');
    const payments = new EMI({
      id: 7,
      loanId: 3,
      name: 'Home EMI',
      amount: 1000,
      frequency: Frequency.MONTHLY,
      startDate: new Date('2020-01-01'),
      endDate,
    }).getPendingOccurrences(new Date('2020-12-01'));

    expect(payments).toHaveLength(4);
    expect(payments.at(-1)?.date.getTime()).toBe(endDate.getTime());
  });
});
