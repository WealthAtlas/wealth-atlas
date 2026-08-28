import { describe, expect, it } from 'vitest';
import {
  addUtcDays,
  addUtcMonths,
  addUtcYears,
  daysBetween,
  isoDate,
  monthKey,
  parseUtcDay,
  utcDay,
  utcMonthStart,
  utcToday,
} from './DateUtils';

// Every assertion here is written as a UTC instant on purpose. These functions
// exist so that the app's date arithmetic gives the same answer on a phone in
// Delhi and a laptop in New York, and a test written with local-time
// constructors would be as zone-dependent as the code it is meant to pin. The
// suite is run under a spread of `TZ` values; nothing below may depend on it.
describe('utcDay', () => {
  it('strips the time from an instant', () => {
    expect(utcDay(new Date('2026-06-15T18:45:12.345Z')).toISOString()).toBe(
      '2026-06-15T00:00:00.000Z'
    );
  });

  it('leaves an already-clean day alone', () => {
    const day = new Date('2026-06-15T00:00:00.000Z');
    expect(utcDay(day).getTime()).toBe(day.getTime());
  });

  it('does not move the day itself', () => {
    // The trap a local truncation falls into: `setHours(0,0,0,0)` on this value
    // yields 14 June in any zone behind UTC, changing the date it represents.
    expect(utcDay(new Date('2026-06-15T00:30:00.000Z')).toISOString()).toBe(
      '2026-06-15T00:00:00.000Z'
    );
  });

  it('copies rather than mutating its argument', () => {
    const original = new Date('2026-06-15T09:00:00.000Z');
    utcDay(original);
    expect(original.toISOString()).toBe('2026-06-15T09:00:00.000Z');
  });
});

describe('parseUtcDay', () => {
  it("reads a date input's YYYY-MM-DD as that calendar day", () => {
    expect(parseUtcDay('2026-06-15')?.toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });

  it('truncates a full timestamp', () => {
    expect(parseUtcDay('2026-06-15T23:59:59.000Z')?.toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });

  // An Invalid Date compares false against everything, so it would slip through
  // every `<=` bound in the domain instead of failing validation.
  it.each(['', '   not a date', undefined])('returns undefined for %o', value => {
    expect(parseUtcDay(value as string | undefined)).toBeUndefined();
  });
});

describe('utcToday', () => {
  it('is a clean day', () => {
    expect(utcToday().toISOString()).toMatch(/T00:00:00\.000Z$/);
  });

  it('is the UTC date, not the local one', () => {
    expect(isoDate(utcToday())).toBe(new Date().toISOString().slice(0, 10));
  });
});

describe('addUtcMonths', () => {
  it('adds and subtracts whole months', () => {
    expect(addUtcMonths(new Date('2026-06-15'), 3).toISOString()).toBe('2026-09-15T00:00:00.000Z');
    expect(addUtcMonths(new Date('2026-06-15'), -7).toISOString()).toBe('2025-11-15T00:00:00.000Z');
  });

  // Without clamping, `Date.UTC(2020, 1, 31)` is 2 March, which for a schedule
  // means a month-end instalment landing in the following month.
  it('clamps into a shorter month rather than overflowing into the next', () => {
    expect(addUtcMonths(new Date('2020-01-31'), 1).toISOString()).toBe('2020-02-29T00:00:00.000Z');
    expect(addUtcMonths(new Date('2021-01-31'), 1).toISOString()).toBe('2021-02-28T00:00:00.000Z');
    expect(addUtcMonths(new Date('2026-08-31'), 1).toISOString()).toBe('2026-09-30T00:00:00.000Z');
  });

  // The half that matters for a recurring schedule: clamping against the
  // previous occurrence loses the day-of-month for good, so the anchor is the
  // day the schedule started on and every step is measured from it.
  it('restores the anchored day once the months are long enough again', () => {
    expect(addUtcMonths(new Date('2020-02-29'), 1, 31).toISOString()).toBe(
      '2020-03-31T00:00:00.000Z'
    );
    expect(addUtcMonths(new Date('2020-03-31'), 1, 31).toISOString()).toBe(
      '2020-04-30T00:00:00.000Z'
    );
  });
});

describe('addUtcYears', () => {
  it('adds whole years', () => {
    expect(addUtcYears(new Date('2026-06-15'), 2).toISOString()).toBe('2028-06-15T00:00:00.000Z');
  });

  it('clamps 29 February into a common year', () => {
    expect(addUtcYears(new Date('2020-02-29'), 1).toISOString()).toBe('2021-02-28T00:00:00.000Z');
  });

  it('returns to 29 February when anchored to it', () => {
    expect(addUtcYears(new Date('2021-02-28'), 3, 29).toISOString()).toBe(
      '2024-02-29T00:00:00.000Z'
    );
  });
});

describe('addUtcDays', () => {
  it('crosses a month and a leap day without a DST correction', () => {
    expect(addUtcDays(new Date('2020-02-27'), 3).toISOString()).toBe('2020-03-01T00:00:00.000Z');
  });

  // A local-time day step lands on 23:00 or 01:00 across a DST boundary, which
  // is how a weekly schedule drifts an hour at a time until it changes day.
  it('stays at midnight across a DST boundary', () => {
    expect(addUtcDays(new Date('2026-03-28'), 1).toISOString()).toBe('2026-03-29T00:00:00.000Z');
    expect(addUtcDays(new Date('2026-10-24'), 7).toISOString()).toBe('2026-10-31T00:00:00.000Z');
  });
});

describe('utcMonthStart', () => {
  it('is the first of the containing UTC month', () => {
    expect(utcMonthStart(new Date('2026-06-15T20:00:00.000Z')).toISOString()).toBe(
      '2026-06-01T00:00:00.000Z'
    );
  });

  // The bug this replaced: `new Date(y, m)` is local midnight, so in IST the
  // June bucket serialised as `2026-05-31T18:30Z` and every consumer that keyed
  // off `toISOString()` filed a June expense under May.
  it('agrees with monthKey on the month it belongs to', () => {
    const date = new Date('2026-06-01T00:00:00.000Z');
    expect(utcMonthStart(date).toISOString().slice(0, 7)).toBe(monthKey(date));
  });
});

describe('monthKey', () => {
  it('reports the UTC month of the first and last instant of one', () => {
    expect(monthKey(new Date('2026-06-01T00:00:00.000Z'))).toBe('2026-06');
    expect(monthKey(new Date('2026-06-30T23:59:59.999Z'))).toBe('2026-06');
  });

  it('pads a single-digit month', () => {
    expect(monthKey(new Date('2026-01-09'))).toBe('2026-01');
  });
});

describe('daysBetween', () => {
  it('counts whole days, signed', () => {
    expect(daysBetween(new Date('2026-06-01'), new Date('2026-06-15'))).toBe(14);
    expect(daysBetween(new Date('2026-06-15'), new Date('2026-06-01'))).toBe(-14);
    expect(daysBetween(new Date('2026-06-01'), new Date('2026-06-01'))).toBe(0);
  });

  // Rounding, not truncation: a 23- or 25-hour span across a DST boundary is
  // still one day, and `Math.floor` would report 0.
  it('is exact across a DST boundary and for partial days', () => {
    expect(daysBetween(new Date('2026-03-28T22:00:00Z'), new Date('2026-03-29T03:00:00Z'))).toBe(1);
    expect(daysBetween(new Date('2026-02-27'), new Date('2026-03-01'))).toBe(2);
    expect(daysBetween(new Date('2020-02-27'), new Date('2020-03-01'))).toBe(3);
  });
});

describe('isoDate', () => {
  it('is the UTC calendar day', () => {
    expect(isoDate(new Date('2026-06-15T23:30:00.000Z'))).toBe('2026-06-15');
  });

  it('round-trips through parseUtcDay', () => {
    const day = parseUtcDay('2026-06-15');
    expect(isoDate(day!)).toBe('2026-06-15');
  });
});
