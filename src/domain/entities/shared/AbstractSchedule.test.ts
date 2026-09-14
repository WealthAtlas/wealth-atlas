import { describe, expect, it } from 'vitest';
import { computeScheduleEndDate, countScheduleOccurrences } from './AbstractSchedule';
import { Frequency } from './Frequency';

describe('countScheduleOccurrences', () => {
  it('counts a same-day schedule as one occurrence', () => {
    const day = new Date('2026-03-15');
    expect(countScheduleOccurrences(day, day, Frequency.MONTHLY)).toBe(1);
  });

  it('counts the end date itself, matching shouldAdd being inclusive', () => {
    // Monthly from 1 Jan through 1 May: Jan, Feb, Mar, Apr, May = 5.
    const count = countScheduleOccurrences(
      new Date('2026-01-01'),
      new Date('2026-05-01'),
      Frequency.MONTHLY
    );
    expect(count).toBe(5);
  });

  it('anchors month-end schedules on the start day, not the previous occurrence', () => {
    // 31 Jan -> 28/29 Feb -> 31 Mar: three monthly occurrences by 31 Mar.
    const count = countScheduleOccurrences(
      new Date('2026-01-31'),
      new Date('2026-03-31'),
      Frequency.MONTHLY
    );
    expect(count).toBe(3);
  });

  it('returns 0 for an end date before the start date', () => {
    const count = countScheduleOccurrences(
      new Date('2026-05-01'),
      new Date('2026-01-01'),
      Frequency.MONTHLY
    );
    expect(count).toBe(0);
  });
});

describe('computeScheduleEndDate', () => {
  it('returns the start date itself for a single occurrence', () => {
    const start = new Date('2026-03-15');
    expect(computeScheduleEndDate(start, Frequency.MONTHLY, 1).getTime()).toBe(start.getTime());
  });

  it('anchors month-end schedules on the start day', () => {
    // 31 Jan, monthly, 3 occurrences: 31 Jan -> 28/29 Feb -> 31 Mar.
    const end = computeScheduleEndDate(new Date('2026-01-31'), Frequency.MONTHLY, 3);
    expect(end.toISOString().slice(0, 10)).toBe('2026-03-31');
  });

  it('rejects a non-positive occurrence count', () => {
    expect(() => computeScheduleEndDate(new Date('2026-01-01'), Frequency.MONTHLY, 0)).toThrow();
  });
});

describe('countScheduleOccurrences and computeScheduleEndDate round-trip', () => {
  const start = new Date('2026-01-31');

  for (const frequency of Object.values(Frequency)) {
    it(`agree with each other for ${frequency}`, () => {
      const occurrences = 5;
      const endDate = computeScheduleEndDate(start, frequency, occurrences);
      expect(countScheduleOccurrences(start, endDate, frequency)).toBe(occurrences);
    });
  }
});
