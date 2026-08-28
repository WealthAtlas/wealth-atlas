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

// The boundary the dialog promises: it summarises a schedule as "until {endDate}",
// so an instalment falling exactly on the end date is one the user asked for. The
// rule lives in AbstractSchedule.shouldAdd and is shared with EMI, and it is a
// single character -- flipping it back to `<` passes tsc, the build and every
// other test in this suite, and only shows up as a missing final instalment.
//
// ISO strings throughout, because a calendar date *is* UTC midnight now. These
// assertions are exact in every zone, which is the point of the convention: the
// day-of-month no longer depends on where the device is. The `TZ` sweep in the
// commit is what proves it -- an earlier draft of these tests used local-midnight
// constructors and passed under `<` as well, which is worse than no test.
describe('the SIP end date', () => {
  const monthly = (startDate: string, endDate: string) =>
    new SIP({
      id: 9,
      assetId: 2,
      price: 500,
      quantity: 1,
      frequency: Frequency.MONTHLY,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
    });

  const datesOf = (startDate: string, endDate: string, till = '2022-01-01') =>
    monthly(startDate, endDate)
      .getPendingOccurrences(new Date(till))
      .map(investment => investment.date.toISOString());

  it('includes the instalment falling on it', () => {
    const dates = datesOf('2020-01-01', '2021-01-01');

    expect(dates).toHaveLength(13);
    expect(dates.at(-1)).toBe('2021-01-01T00:00:00.000Z');
  });

  // Start == end validates (validateSchedule only rejects end < start), so it has
  // to mean something. Exclusive it meant a SIP that saved fine and never fired.
  it('produces the single instalment of a same-day schedule', () => {
    expect(datesOf('2020-01-01', '2020-01-01')).toEqual(['2020-01-01T00:00:00.000Z']);
  });

  it('stops after it rather than running to the frequency step beyond', () => {
    expect(datesOf('2020-01-15', '2020-03-15')).toHaveLength(3);
  });

  // The other cap is independent: today still bounds generation, so a schedule
  // whose end date has not arrived yet does not run to completion on startup.
  it('is not the only bound -- `till` still cuts the series short', () => {
    const dates = datesOf('2020-01-01', '2021-01-01', '2020-03-10');

    expect(dates).toHaveLength(3);
    expect(dates.at(-1)).toBe('2020-03-01T00:00:00.000Z');
  });

  // Every occurrence is a clean UTC midnight, whatever zone the device is in.
  // This is the assertion that fails if anything reintroduces a local-time step.
  it('generates only midnight-UTC days', () => {
    const dates = datesOf('2020-01-31', '2020-12-31');

    expect(dates).not.toHaveLength(0);
    expect(dates.every(date => date.endsWith('T00:00:00.000Z'))).toBe(true);
  });

  // A monthly schedule on the 31st pays on the last day of a short month, and
  // does not walk forward: overflowing 31 Feb into 2 March would move every
  // later instalment with it.
  it('clamps a 31st to the last day of a shorter month', () => {
    expect(datesOf('2020-01-31', '2020-05-31')).toEqual([
      '2020-01-31T00:00:00.000Z',
      '2020-02-29T00:00:00.000Z',
      '2020-03-31T00:00:00.000Z',
      '2020-04-30T00:00:00.000Z',
      '2020-05-31T00:00:00.000Z',
    ]);
  });
});
