import { describe, expect, it } from 'vitest';
import { Frequency } from '../shared/Frequency';
import { SIP } from './SIP';

const sip = (id: number | undefined) =>
  new SIP({
    id,
    assetId: 2,
    price: 500,
    quantity: 1,
    frequency: Frequency.MONTHLY,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2026-05-01'),
  });

describe('SIP occurrences', () => {
  // Same cascade as EMI/Payment: deleteBySipId can only find investments that
  // carry the reference back to the SIP that generated them.
  it('stamps the generating SIP on every investment it produces', () => {
    const investments = sip(9).getPendingOccurrences(new Date('2026-04-15'));

    expect(investments).not.toHaveLength(0);
    expect(investments.every(investment => investment.sipId === 9)).toBe(true);
  });

  it('stamps the generating SIP on the next single occurrence', () => {
    expect(sip(9).getNextOccurrenceData()?.sipId).toBe(9);
  });

  it('leaves the reference unset for an unsaved SIP', () => {
    expect(sip(undefined).getNextOccurrenceData()?.sipId).toBeUndefined();
  });
});
