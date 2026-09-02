import { describe, expect, it } from 'vitest';
import { AssetCategory } from '../entities/assets/AssetCategory';
import { FUND_SEGMENTS, segmentFor, segmentNames, segmentsForCategory } from './FundSegments';
import { matchSegment, pruneUniverse, UniverseScheme } from './FundScreen';

/**
 * The segment table is a set of regular expressions run against scheme names,
 * which is exactly the kind of thing that fails silently: a pattern that matches
 * nothing returns an empty screen, and an empty screen reads as "no funds in
 * that segment" rather than as a broken pattern. That is the failure the news
 * layer already shipped once, when a remembered topic vocabulary matched no
 * article and every category was honestly reported as having no news.
 *
 * So the fixture below is real scheme names, copied verbatim from AMFI's
 * published list, and every segment must claim at least one of them.
 */

/** Verbatim from `api.mfapi.in/mf`, one per segment plus the traps. */
const REAL_SCHEMES: UniverseScheme[] = [
  { code: 118275, name: 'Canara Robeco Flexi Cap Fund - Direct Plan - GROWTH OPTION' },
  { code: 118424, name: 'BANDHAN Flexi Cap Fund - Direct Plan - Growth' },
  { code: 120465, name: 'Canara Robeco Large Cap Fund - Direct Plan - GROWTH OPTION' },
  { code: 120467, name: 'Canara Robeco Large and Mid Cap Fund - Direct Plan - GROWTH OPTION' },
  { code: 118533, name: 'Franklin India Mid Cap Fund - Direct Plan - Growth' },
  { code: 118530, name: 'Franklin India Small Cap Fund - Direct Plan - Growth' },
  { code: 118667, name: 'Nippon India Multi Cap Fund - Direct Plan - Growth Option' },
  { code: 118438, name: 'Bandhan Focused Fund - Direct Plan - Growth' },
  { code: 120847, name: 'Quantum Value Fund - Direct Plan - Growth Option' },
  { code: 120841, name: 'Quantum ELSS Tax Saver Fund - Direct Plan - Growth Option' },
  { code: 118270, name: 'Canara Robeco Aggressive Hybrid Fund - Direct Plan - GROWTH OPTION' },
  { code: 143537, name: 'ICICI Prudential Balanced Advantage Fund - Direct Plan - Growth' },
  { code: 120843, name: 'Quantum Multi Asset Active FOF - Direct Plan - Growth Option' },
  { code: 120716, name: 'UTI Nifty 50 Index Fund - Direct Plan - Growth Option' },
  { code: 125354, name: 'IDBI Nifty Next 50 Index Fund Growth Direct' },
  { code: 119063, name: 'Nippon India Index Fund - BSE Sensex Plan - Direct Plan - Growth' },
  { code: 120829, name: 'UTI - Gold Exchange Traded Fund - Direct Plan - Growth' },
  { code: 147704, name: 'Nippon India Silver ETF FOF - Direct Plan - Growth Option' },
  { code: 120837, name: 'Quantum Liquid Fund - Direct Plan - Growth Option' },
  { code: 118524, name: 'Franklin India Money Market Fund - Direct Plan - Growth' },
  { code: 118522, name: 'Canara Robeco Ultra Short to Short Term Fund - Direct Plan - Growth' },
  { code: 130502, name: 'HSBC Short Duration Fund - Growth Direct' },
  { code: 118516, name: 'Franklin India Corporate Bond Fund - Direct Plan - Growth' },
  { code: 119078, name: 'Aditya Birla Sun Life Banking & PSU Debt Fund - Direct Plan - Growth' },
  { code: 118264, name: 'Canara Robeco Gilt Advantage Fund - Direct Plan - Growth Option' },
  { code: 118348, name: 'IDBI Dynamic Bond Fund Growth Direct' },
  { code: 149417, name: 'PineBridge India - US Equity Fund - Direct Plan - Growth option' },
];

describe('the segment table', () => {
  it('claims at least one real scheme for every segment it offers', () => {
    // A pattern matching nothing is the silent failure this test exists for: an
    // empty screen is indistinguishable from a segment with no funds in it.
    const unmatched = FUND_SEGMENTS.filter(
      segment => matchSegment(REAL_SCHEMES, segment).length === 0
    ).map(segment => segment.name);

    expect(unmatched).toEqual([]);
  });

  it('does not count a Large & Mid Cap fund as Large Cap or Mid Cap', () => {
    // The one genuine ambiguity in SEBI's naming: the name contains both
    // neighbouring segment names, so without an exclusion it is screened three
    // times and the user is offered the same fund under three headings.
    const largeAndMid = 'Canara Robeco Large and Mid Cap Fund - Direct Plan - GROWTH OPTION';

    for (const name of ['Large Cap', 'Mid Cap']) {
      const segment = segmentFor(name)!;
      const matched = matchSegment(REAL_SCHEMES, segment).map(scheme => scheme.name);
      expect(matched).not.toContain(largeAndMid);
    }

    expect(matchSegment(REAL_SCHEMES, segmentFor('Large & Mid Cap')!)).toHaveLength(1);
  });

  it('keeps Nifty 50 apart from Nifty Next 50', () => {
    // Two indices that share a name prefix and behave very differently. Matching
    // one as the other would attach a real NAV history to the wrong index.
    const nifty50 = matchSegment(REAL_SCHEMES, segmentFor('Nifty 50 Index')!);
    expect(nifty50.map(scheme => scheme.code)).toEqual([120716]);

    const next50 = matchSegment(REAL_SCHEMES, segmentFor('Nifty Next 50 Index')!);
    expect(next50.map(scheme => scheme.code)).toEqual([125354]);
  });

  it('keeps gold apart from silver, and ultra short apart from short', () => {
    expect(matchSegment(REAL_SCHEMES, segmentFor('Gold')!).map(s => s.code)).toEqual([120829]);
    expect(matchSegment(REAL_SCHEMES, segmentFor('Silver')!).map(s => s.code)).toEqual([147704]);
    expect(matchSegment(REAL_SCHEMES, segmentFor('Short Duration')!).map(s => s.code)).toEqual([
      130502,
    ]);
    expect(
      matchSegment(REAL_SCHEMES, segmentFor('Ultra Short Duration')!).map(s => s.code)
    ).toEqual([118522]);
  });

  it('resolves a segment name whatever separators and case the model sends', () => {
    for (const spelling of ['Flexi Cap', 'flexi cap', 'FLEXI-CAP', 'flexi_cap', '  Flexi Cap  ']) {
      expect(segmentFor(spelling)?.name).toBe('Flexi Cap');
    }
  });

  it('does not resolve a segment it cannot screen', () => {
    // A model will invent a plausible segment. The caller has to be able to tell
    // that apart from one this table covers, so it can say so rather than
    // returning an empty screen that reads as "no such funds".
    expect(segmentFor('Thematic Infrastructure')).toBeUndefined();
    expect(segmentFor('')).toBeUndefined();
  });

  it('maps every segment to a category the app actually records', () => {
    const known = new Set<string>(Object.values(AssetCategory));
    for (const segment of FUND_SEGMENTS) {
      expect(known).toContain(segment.category);
    }
  });

  it('offers segments for the categories a fund holding would be recorded under', () => {
    // The screen tool defaults to the segments of an underweight category, so a
    // category with no segment silently yields no suggestion.
    expect(segmentsForCategory(AssetCategory.INDEX_FUND).length).toBeGreaterThan(0);
    expect(segmentsForCategory(AssetCategory.DEBT).length).toBeGreaterThan(0);
    expect(segmentsForCategory(AssetCategory.MUTUAL_FUNDS).length).toBeGreaterThan(0);
    expect(segmentsForCategory(AssetCategory.GOLD).length).toBeGreaterThan(0);

    // Real Estate and Fixed Deposit are deliberately absent: no mutual fund
    // scheme is one, so a segment claiming to screen them would be a fiction.
    expect(segmentsForCategory(AssetCategory.REAL_ESTATE)).toEqual([]);
    expect(segmentsForCategory(AssetCategory.FIXED_DEPOSIT)).toEqual([]);
  });

  it('names every segment uniquely', () => {
    expect(new Set(segmentNames()).size).toBe(FUND_SEGMENTS.length);
  });

  it('screens only what survives the plan-and-option prune', () => {
    // End to end over the real fixture: the prune runs before the segment match
    // in the port, so a segment must never be handed a regular plan or an IDCW
    // variant to rank against a direct-growth NAV.
    const pruned = pruneUniverse(REAL_SCHEMES);
    expect(pruned).toHaveLength(REAL_SCHEMES.length);
  });
});
