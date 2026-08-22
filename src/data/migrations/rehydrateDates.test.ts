import { describe, expect, it } from 'vitest';
import { rehydrateSnapshotDates, rehydrateTableDates } from './rehydrateDates';

/**
 * A table absent from `DATE_FIELDS` is skipped in silence — no error, no
 * warning, just Date columns that stay strings and break every comparison that
 * touches them. That makes this the one place a new table's date handling can be
 * asserted rather than assumed.
 */
describe('rehydrateSnapshotDates', () => {
  it('rehydrates the journal’s own dates', () => {
    const data = {
      decisions: [
        {
          id: 1,
          createdAt: '2026-03-14T00:00:00.000Z',
          reviewedAt: '2026-08-01T00:00:00.000Z',
          evidence: { benchmarkAsOf: '2026-03-13', benchmarkLevel: 100 },
        },
      ],
    };

    rehydrateSnapshotDates(data as unknown as Record<string, Record<string, unknown>[]>);

    const row = data.decisions[0] as unknown as Record<string, unknown>;
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.reviewedAt).toBeInstanceOf(Date);
    expect((row.createdAt as Date).toISOString()).toBe('2026-03-14T00:00:00.000Z');
  });

  it('leaves the evidence block’s provenance stamps as the strings they are', () => {
    // Only top-level fields are walked, which is exactly why `IDecisionEvidence`
    // holds no Date: a nested one would silently survive as a string.
    const data = {
      decisions: [
        { id: 1, createdAt: '2026-03-14T00:00:00.000Z', evidence: { benchmarkAsOf: '2026-03-13' } },
      ],
    };

    rehydrateSnapshotDates(data as unknown as Record<string, Record<string, unknown>[]>);

    expect(data.decisions[0].evidence.benchmarkAsOf).toBe('2026-03-13');
  });

  it('turns an absent or empty date into undefined rather than an Invalid Date', () => {
    const data = { decisions: [{ id: 1, createdAt: '2026-03-14T00:00:00.000Z', reviewedAt: '' }] };

    rehydrateSnapshotDates(data as unknown as Record<string, Record<string, unknown>[]>);

    expect((data.decisions[0] as Record<string, unknown>).reviewedAt).toBeUndefined();
  });

  it('rehydrates the other tables’ dates too', () => {
    const data = {
      investments: [{ date: '2026-01-02T00:00:00.000Z' }],
      goals: [{ maturityDate: '2030-01-01T00:00:00.000Z', createdAt: '2026-01-01T00:00:00.000Z' }],
    };

    rehydrateSnapshotDates(data as unknown as Record<string, Record<string, unknown>[]>);

    expect(data.investments[0].date).toBeInstanceOf(Date);
    expect(data.goals[0].maturityDate).toBeInstanceOf(Date);
    expect(data.goals[0].createdAt).toBeInstanceOf(Date);
  });
});

describe('rehydrateTableDates', () => {
  it('does nothing for a table it does not know', () => {
    const rows = [{ createdAt: '2026-03-14T00:00:00.000Z' }];

    rehydrateTableDates('notATable', rows);

    expect(rows[0].createdAt).toBe('2026-03-14T00:00:00.000Z');
  });

  it('leaves a value that is already a Date alone', () => {
    const when = new Date('2026-03-14T00:00:00.000Z');
    const rows = [{ createdAt: when }];

    rehydrateTableDates('decisions', rows);

    expect(rows[0].createdAt).toBe(when);
  });
});
