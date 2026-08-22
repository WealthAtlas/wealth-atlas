import { describe, expect, it } from 'vitest';
import { computeSeriesTrend, normaliseSeries } from './NavSeries';

/** Days before/after a fixed anchor, so no test depends on the clock. */
const ANCHOR = new Date('2026-08-21T00:00:00.000Z');

function daysAgo(days: number): Date {
  return new Date(ANCHOR.getTime() - days * 24 * 60 * 60 * 1000);
}

function series(values: { day: number; value: number }[]) {
  return values.map(entry => ({ date: daysAgo(entry.day), value: entry.value }));
}

describe('normaliseSeries', () => {
  it('sorts ascending by date', () => {
    const sorted = normaliseSeries(
      series([
        { day: 0, value: 3 },
        { day: 10, value: 1 },
      ])
    );

    expect(sorted.map(point => point.value)).toEqual([1, 3]);
  });

  it('drops points that cannot be used rather than treating them as zero', () => {
    const sorted = normaliseSeries([
      { date: daysAgo(1), value: Number.NaN },
      { date: new Date('nonsense'), value: 5 },
      { date: daysAgo(0), value: 7 },
    ]);

    expect(sorted).toHaveLength(1);
    expect(sorted[0].value).toBe(7);
  });
});

describe('computeSeriesTrend', () => {
  it('reports nothing for an empty series rather than a zero', () => {
    expect(computeSeriesTrend([])).toBeUndefined();
  });

  it('measures the drawdown against the window high, not the window start', () => {
    // Up over the year, but well off the high it set in between — the case a
    // plain window return hides completely.
    const trend = computeSeriesTrend(
      series([
        { day: 360, value: 100 },
        { day: 200, value: 150 },
        { day: 0, value: 120 },
      ])
    );

    expect(trend?.returnPercent).toBe(20);
    expect(trend?.drawdownPercent).toBe(-20);
    expect(trend?.high).toBe(150);
  });

  it('reports a zero drawdown when the latest value is the high', () => {
    const trend = computeSeriesTrend(
      series([
        { day: 100, value: 90 },
        { day: 0, value: 110 },
      ])
    );

    expect(trend?.drawdownPercent).toBe(0);
    expect(trend?.highOn).toEqual(daysAgo(0));
  });

  it('excludes observations older than the window', () => {
    const trend = computeSeriesTrend(
      series([
        { day: 900, value: 500 }, // an old high, outside a one-year window
        { day: 300, value: 100 },
        { day: 0, value: 110 },
      ]),
      365
    );

    expect(trend?.high).toBe(110);
    expect(trend?.observations).toBe(2);
  });

  it('anchors the window to the last observation, not to the clock', () => {
    // A series that stopped updating a month ago still gets a full window. The
    // day-390 point sits 360 days before the last observation, so it is inside
    // a one-year window measured from there — and outside one measured from
    // today, which is the bug this pins.
    const stale = series([
      { day: 390, value: 100 },
      { day: 30, value: 120 },
    ]);

    const trend = computeSeriesTrend(stale, 365);

    expect(trend?.latest).toBe(120);
    expect(trend?.latestOn).toEqual(daysAgo(30));
    expect(trend?.observations).toBe(2);
    expect(trend?.returnPercent).toBe(20);
  });

  it('reports the earliest day that set the high when it is matched later', () => {
    const trend = computeSeriesTrend(
      series([
        { day: 200, value: 150 },
        { day: 100, value: 150 },
        { day: 0, value: 140 },
      ])
    );

    expect(trend?.highOn).toEqual(daysAgo(200));
  });

  it('does not divide by a non-positive base', () => {
    const trend = computeSeriesTrend(
      series([
        { day: 10, value: 0 },
        { day: 0, value: 50 },
      ])
    );

    expect(trend?.returnPercent).toBe(0);
    expect(Number.isFinite(trend?.drawdownPercent ?? Infinity)).toBe(true);
  });
});
