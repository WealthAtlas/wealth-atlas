import { AssetCategory } from '../entities/assets/AssetCategory';

/**
 * The fund segments a screen can be run over, and how each is recognised.
 *
 * This table exists because of a gap the rest of the market layer does not
 * cover. `CATEGORY_BENCHMARKS` answers "how has the market my holdings sit in
 * moved"; every other chat tool reads the user's own records. Neither can answer
 * "what should I add" — nothing in the app knows a fund the user does not
 * already own, so a model asked for a suggestion has only its training memory
 * to answer from, and a remembered fund name is the most convincing wrong
 * sentence it can write: the scheme may have merged, been renamed, or closed,
 * and its performance is quoted as of a date the model cannot state.
 *
 * So the universe is fetched instead. AMFI's published scheme list is the whole
 * of the Indian mutual fund market (~37,800 schemes), it is keyless, and it
 * sends `Access-Control-Allow-Origin: *`, which is the binding constraint from
 * a browser. What it does not carry is a category: there is no category
 * endpoint, no filter parameter, and `/mf/search` is hard-capped at 15 results,
 * so segmentation has to happen locally against scheme *names*.
 *
 * That works only because SEBI mandates the category in the scheme name — an
 * AMC's flexi cap fund must be called a Flexi Cap Fund — and it is verifiable:
 * every pattern here was run against the live list, and each matches on the
 * order of one scheme per fund house, which is what SEBI's one-scheme-per-
 * category rule predicts. A pattern that matched thousands, or none, would be a
 * pattern describing something other than a segment.
 *
 * `sebiCategoryHint` is documentation and is deliberately **not** a filter. The
 * news layer already paid for the other choice: a query built from a remembered
 * vocabulary matched nothing for ever and read as a quiet news day. A category
 * string that turns out to be spelled differently would silently empty every
 * screen, so the real `scheme_category` the provider returns is reported next
 * to the match instead, and the caller can see whether the two agree.
 */

export interface FundSegment {
  /** What the user and the assistant call this segment. */
  name: string;
  /** Matched against the scheme name, case-insensitively. */
  include: RegExp;
  /**
   * Names that match `include` but belong to a neighbouring segment. Large &
   * Mid Cap contains both "large cap" and "mid cap", so without this it would
   * be counted three times.
   */
  exclude?: RegExp;
  /** The asset category a holding in this segment would be recorded under. */
  category: AssetCategory;
  /** The provider's own category string, for comparison. Never a filter. */
  sebiCategoryHint: string;
}

export const FUND_SEGMENTS: readonly FundSegment[] = [
  // Equity. One scheme per fund house per segment, by regulation.
  {
    name: 'Flexi Cap',
    include: /flexi[\s-]?cap/i,
    category: AssetCategory.MUTUAL_FUNDS,
    sebiCategoryHint: 'Equity Scheme - Flexi Cap Fund',
  },
  {
    name: 'Large Cap',
    include: /large[\s-]?cap/i,
    exclude: /large\s*(&|and)\s*mid/i,
    category: AssetCategory.MUTUAL_FUNDS,
    sebiCategoryHint: 'Equity Scheme - Large Cap Fund',
  },
  {
    name: 'Large & Mid Cap',
    include: /large\s*(&|and)\s*mid[\s-]?cap/i,
    category: AssetCategory.MUTUAL_FUNDS,
    sebiCategoryHint: 'Equity Scheme - Large & Mid Cap Fund',
  },
  {
    name: 'Mid Cap',
    include: /mid[\s-]?cap/i,
    exclude: /large\s*(&|and)\s*mid/i,
    category: AssetCategory.MUTUAL_FUNDS,
    sebiCategoryHint: 'Equity Scheme - Mid Cap Fund',
  },
  {
    name: 'Small Cap',
    include: /small[\s-]?cap/i,
    category: AssetCategory.MUTUAL_FUNDS,
    sebiCategoryHint: 'Equity Scheme - Small Cap Fund',
  },
  {
    name: 'Multi Cap',
    include: /multi[\s-]?cap/i,
    category: AssetCategory.MUTUAL_FUNDS,
    sebiCategoryHint: 'Equity Scheme - Multi Cap Fund',
  },
  {
    name: 'Focused',
    include: /focused/i,
    category: AssetCategory.MUTUAL_FUNDS,
    sebiCategoryHint: 'Equity Scheme - Focused Fund',
  },
  {
    name: 'Value',
    include: /value fund|contra fund/i,
    category: AssetCategory.MUTUAL_FUNDS,
    sebiCategoryHint: 'Equity Scheme - Value Fund',
  },
  {
    name: 'ELSS',
    include: /\belss\b|tax\s*saver/i,
    category: AssetCategory.MUTUAL_FUNDS,
    sebiCategoryHint: 'Equity Scheme - ELSS',
  },

  // Hybrid.
  {
    name: 'Aggressive Hybrid',
    include: /aggressive hybrid/i,
    category: AssetCategory.MUTUAL_FUNDS,
    sebiCategoryHint: 'Hybrid Scheme - Aggressive Hybrid Fund',
  },
  {
    name: 'Balanced Advantage',
    include: /balanced advantage|dynamic asset alloc/i,
    category: AssetCategory.MUTUAL_FUNDS,
    sebiCategoryHint: 'Hybrid Scheme - Dynamic Asset Allocation',
  },
  {
    name: 'Multi Asset',
    include: /multi[\s-]?asset/i,
    category: AssetCategory.MUTUAL_FUNDS,
    sebiCategoryHint: 'Hybrid Scheme - Multi Asset Allocation',
  },

  // Index. Split by the index tracked, because "index fund" alone matches
  // hundreds of schemes tracking indices that behave nothing like each other.
  {
    name: 'Nifty 50 Index',
    include: /nifty\s*50\s*(index|plan)/i,
    exclude: /next 50|equal/i,
    category: AssetCategory.INDEX_FUND,
    sebiCategoryHint: 'Other Scheme - Index Funds',
  },
  {
    name: 'Nifty Next 50 Index',
    include: /next\s*50/i,
    category: AssetCategory.INDEX_FUND,
    sebiCategoryHint: 'Other Scheme - Index Funds',
  },
  {
    name: 'Sensex Index',
    include: /sensex/i,
    category: AssetCategory.INDEX_FUND,
    sebiCategoryHint: 'Other Scheme - Index Funds',
  },

  // Commodity.
  {
    name: 'Gold',
    include: /\bgold\b/i,
    exclude: /silver/i,
    category: AssetCategory.GOLD,
    sebiCategoryHint: 'Other Scheme - Gold ETF',
  },
  {
    name: 'Silver',
    include: /\bsilver\b/i,
    category: AssetCategory.OTHER,
    sebiCategoryHint: 'Other Scheme - Silver ETF',
  },

  // Debt.
  {
    name: 'Liquid',
    include: /liquid fund/i,
    category: AssetCategory.DEBT,
    sebiCategoryHint: 'Debt Scheme - Liquid Fund',
  },
  {
    name: 'Money Market',
    include: /money market/i,
    category: AssetCategory.DEBT,
    sebiCategoryHint: 'Debt Scheme - Money Market Fund',
  },
  {
    name: 'Ultra Short Duration',
    include: /ultra short/i,
    category: AssetCategory.DEBT,
    sebiCategoryHint: 'Debt Scheme - Ultra Short Duration Fund',
  },
  {
    name: 'Short Duration',
    include: /short duration/i,
    exclude: /ultra/i,
    category: AssetCategory.DEBT,
    sebiCategoryHint: 'Debt Scheme - Short Duration Fund',
  },
  {
    name: 'Corporate Bond',
    include: /corporate bond/i,
    category: AssetCategory.DEBT,
    sebiCategoryHint: 'Debt Scheme - Corporate Bond Fund',
  },
  {
    name: 'Banking & PSU Debt',
    include: /banking\s*(&|and)\s*psu/i,
    category: AssetCategory.DEBT,
    sebiCategoryHint: 'Debt Scheme - Banking and PSU Fund',
  },
  {
    name: 'Gilt',
    include: /\bgilt\b/i,
    category: AssetCategory.DEBT,
    sebiCategoryHint: 'Debt Scheme - Gilt Fund',
  },
  {
    name: 'Dynamic Bond',
    include: /dynamic bond/i,
    category: AssetCategory.DEBT,
    sebiCategoryHint: 'Debt Scheme - Dynamic Bond',
  },

  // International, reachable only through Indian feeder funds.
  {
    name: 'US Equity',
    include: /nasdaq|s&p\s*500|us equity|global equity/i,
    category: AssetCategory.MUTUAL_FUNDS,
    sebiCategoryHint: 'Other Scheme - FoF Overseas',
  },
];

export function segmentNames(): string[] {
  return FUND_SEGMENTS.map(segment => segment.name);
}

/** Case-insensitive and forgiving about the separators a model might send. */
export function segmentFor(name: string): FundSegment | undefined {
  const wanted = name
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, ' ');
  return FUND_SEGMENTS.find(
    segment => segment.name.toLowerCase().replace(/[\s_-]+/g, ' ') === wanted
  );
}

/** The segments a holding in this asset category could be added from. */
export function segmentsForCategory(category: string): FundSegment[] {
  return FUND_SEGMENTS.filter(segment => segment.category === category);
}
