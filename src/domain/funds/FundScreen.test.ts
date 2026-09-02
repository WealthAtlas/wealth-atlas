import { describe, expect, it } from 'vitest';
import {
  FundCandidate,
  isStale,
  pruneUniverse,
  sortCandidates,
  STALE_AFTER_DAYS,
  UniverseScheme,
} from './FundScreen';

const today = new Date('2026-09-02T00:00:00.000Z');

describe('pruneUniverse', () => {
  it('keeps one variant of a fund that AMFI lists six times', () => {
    // The real shape of the problem: one fund, six schemes, same portfolio.
    // Keeping more than one offers the user the same fund repeatedly, and
    // ranking a regular plan's NAV against a direct plan's compares a
    // distributor commission rather than a portfolio.
    const oneFund: UniverseScheme[] = [
      { code: 1, name: 'Acme Flexi Cap Fund - Regular Plan - Growth' },
      { code: 2, name: 'Acme Flexi Cap Fund - Regular Plan - IDCW' },
      { code: 3, name: 'Acme Flexi Cap Fund - Direct Plan - Growth' },
      { code: 4, name: 'Acme Flexi Cap Fund - Direct Plan - IDCW' },
      { code: 5, name: 'Acme Flexi Cap Fund - Direct Plan - IDCW Payout' },
      { code: 6, name: 'Acme Flexi Cap Fund - Direct Plan - IDCW Reinvestment' },
    ];

    expect(pruneUniverse(oneFund).map(scheme => scheme.code)).toEqual([3]);
  });

  it('accepts the word orders and casings AMFI actually publishes', () => {
    // These are verbatim real names. The list is decades of inconsistent
    // free-text entry, so a prune written against one house's convention drops
    // whole fund houses silently.
    const spellings: UniverseScheme[] = [
      { code: 1, name: 'Canara Robeco Flexi Cap Fund - Direct Plan - GROWTH OPTION' },
      { code: 2, name: 'HSBC Short Duration Fund - Growth Direct' },
      { code: 3, name: 'IDBI Dynamic Bond Fund Growth Direct' },
      { code: 4, name: 'PineBridge India - US Equity Fund - Direct Plan - Growth option' },
    ];

    expect(pruneUniverse(spellings)).toHaveLength(4);
  });

  it('drops a scheme whose name says dividend even where it also says growth', () => {
    // "Growth" appears in some income-distribution scheme names, so the
    // exclusion has to win over the inclusion rather than the other way round.
    const trap: UniverseScheme[] = [
      { code: 1, name: 'Acme Fund - Direct Plan - Dividend Reinvestment Growth' },
    ];
    expect(pruneUniverse(trap)).toEqual([]);
  });
});

describe('isStale', () => {
  it('admits a fund publishing a NAV yesterday', () => {
    expect(isStale('2026-09-01', today)).toBe(false);
  });

  it('excludes a fund that stopped publishing years ago', () => {
    // Not hypothetical: the IDBI Nifty 50 index fund was merged into LIC MF in
    // 2023 and still lists under a name that reads perfectly current, still
    // answers with a NAV, and would otherwise be suggested as a fund to buy.
    expect(isStale('2023-07-27', today)).toBe(true);
  });

  it('treats an unknown NAV date as stale rather than as live', () => {
    // A metadata lookup that failed leaves liveness unknown, and an unknown
    // liveness is not a licence to recommend the scheme.
    expect(isStale(undefined, today)).toBe(true);
    expect(isStale('not-a-date', today)).toBe(true);
  });

  it('holds the boundary at the stated number of days', () => {
    const day = 24 * 60 * 60 * 1000;
    const atLimit = new Date(today.getTime() - STALE_AFTER_DAYS * day);
    const pastLimit = new Date(today.getTime() - (STALE_AFTER_DAYS + 1) * day);

    expect(isStale(atLimit.toISOString().slice(0, 10), today)).toBe(false);
    expect(isStale(pastLimit.toISOString().slice(0, 10), today)).toBe(true);
  });

  it('does not treat a NAV dated after today as stale', () => {
    // A mirror running ahead of this device's clock, or a device whose clock is
    // behind, must not silently empty a whole segment.
    expect(isStale('2026-09-03', today)).toBe(false);
  });
});

describe('sortCandidates', () => {
  const candidate = (name: string, fundHouse?: string, latestNav?: number): FundCandidate => ({
    code: name.length,
    name,
    fundHouse,
    latestNav,
  });

  it('groups by fund house rather than ordering by past return', () => {
    // The order is deliberately not a ranking. A model handed a list sorted by
    // return treats position one as the recommendation, which is how a fund gets
    // bought for having already run — so performance is not in this result at
    // all, and the order carries no claim about quality.
    const sorted = sortCandidates([
      candidate('Zebra Flexi Cap Fund', 'Zebra Mutual Fund', 10),
      candidate('Acme Flexi Cap Fund', 'Acme Mutual Fund', 500),
      candidate('Beta Flexi Cap Fund', 'Beta Mutual Fund', 250),
    ]);

    expect(sorted.map(entry => entry.fundHouse)).toEqual([
      'Acme Mutual Fund',
      'Beta Mutual Fund',
      'Zebra Mutual Fund',
    ]);
  });

  it('does not lose a candidate whose fund house is unknown', () => {
    const sorted = sortCandidates([
      candidate('Beta Flexi Cap Fund', 'Beta Mutual Fund'),
      candidate('Unknown House Fund', undefined),
    ]);

    expect(sorted).toHaveLength(2);
  });

  it('leaves the input untouched', () => {
    const input = [candidate('Zebra Fund', 'Zebra'), candidate('Acme Fund', 'Acme')];
    sortCandidates(input);
    expect(input.map(entry => entry.fundHouse)).toEqual(['Zebra', 'Acme']);
  });
});
