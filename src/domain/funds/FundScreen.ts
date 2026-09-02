import { FundSegment } from './FundSegments';

/**
 * Pure screening over AMFI's published scheme list. Nothing here reaches the
 * network; fetching and caching live in `src/data/funds/`.
 *
 * The list is the whole market, warts included, and two of those warts would
 * produce a confidently wrong suggestion if left alone.
 *
 * **Plan and option duplicates.** A single fund appears as up to six schemes —
 * regular and direct, growth and two flavours of income distribution — and they
 * are the same portfolio with different costs and payouts. Screening the raw
 * list would offer the user the same fund six times and, worse, would rank a
 * regular plan's NAV against a direct plan's, which differs by the distributor
 * commission alone. `pruneUniverse` keeps direct-growth only: it is the variant
 * a self-directed investor should buy, and it makes the NAV series comparable.
 *
 * **Schemes that no longer exist.** AMFI publishes historical schemes
 * indefinitely, so a fund wound up or merged years ago is still in the list
 * under a name that reads perfectly current. The list itself carries no dates,
 * so the only signal is the scheme's newest NAV: a live fund publishes one
 * every trading day, while a dead one stops. `isStale` is what keeps a merged
 * fund out of a suggestion, and it is not a nicety — the IDBI Nifty 50 index
 * fund, merged into LIC MF in 2023, still lists cleanly and still answers with
 * a NAV, dated three years ago.
 */

/** A row of AMFI's list: all it carries is an identity. */
export interface UniverseScheme {
  code: number;
  name: string;
}

/** What the provider knows about one scheme beyond its name. */
export interface SchemeMeta {
  fundHouse?: string;
  /** The provider's own category string, for comparison with the segment. */
  schemeCategory?: string;
  latestNav?: number;
  /** Day of the newest NAV, as `YYYY-MM-DD`. Never the clock. */
  navAsOf?: string;
}

export interface FundCandidate extends UniverseScheme, SchemeMeta {}

/**
 * Days without a new NAV after which a scheme is treated as no longer running.
 *
 * Generously wide. A live fund publishes every trading day, so the real gap is
 * days; a wound-up one goes silent for good. The margin absorbs a long market
 * holiday and a lagging mirror without ever admitting a fund that has actually
 * stopped, because the alternative errs in the direction that matters: a fund
 * excluded for staleness is one suggestion the user does not get, while one
 * admitted wrongly is a recommendation to buy something that cannot be bought.
 */
export const STALE_AFTER_DAYS = 30;

const DIRECT_PLAN = /\bdirect\b/i;
const GROWTH_OPTION = /\bgrowth\b/i;
/** Every spelling AMFI uses for an income-distribution variant. */
const INCOME_DISTRIBUTION = /idcw|dividend|payout|reinvest/i;

/** Direct-plan growth schemes only — see the note on plan duplicates above. */
export function pruneUniverse(schemes: UniverseScheme[]): UniverseScheme[] {
  return schemes.filter(
    scheme =>
      DIRECT_PLAN.test(scheme.name) &&
      GROWTH_OPTION.test(scheme.name) &&
      !INCOME_DISTRIBUTION.test(scheme.name)
  );
}

/** The schemes whose names place them in this segment. */
export function matchSegment(schemes: UniverseScheme[], segment: FundSegment): UniverseScheme[] {
  return schemes.filter(
    scheme => segment.include.test(scheme.name) && !(segment.exclude?.test(scheme.name) ?? false)
  );
}

/**
 * Whether a scheme has gone quiet. A candidate with no NAV date at all counts
 * as stale: an unknown liveness is not a licence to suggest it.
 */
export function isStale(navAsOf: string | undefined, today: Date): boolean {
  if (!navAsOf) return true;
  const observed = new Date(`${navAsOf}T00:00:00.000Z`);
  if (Number.isNaN(observed.getTime())) return true;
  const days = (today.getTime() - observed.getTime()) / (24 * 60 * 60 * 1000);
  return days > STALE_AFTER_DAYS;
}

/**
 * Alphabetical by fund house, then name.
 *
 * Deliberately **not** by past return, and this is a design decision rather
 * than an omission. Ranking a segment by trailing NAV growth would present the
 * fund that has run hottest as the fund to buy, which is the single most
 * reliable way to buy a peak — and the list would carry that implication whether
 * or not the reply repeated it, because a model handed a sorted list treats
 * position one as the answer. Performance figures belong to `compareFunds`,
 * where the caller asks for named schemes and gets the drawdown alongside the
 * return, and where the prompt can require both to be quoted.
 */
export function sortCandidates(candidates: FundCandidate[]): FundCandidate[] {
  return candidates
    .slice()
    .sort(
      (left, right) =>
        (left.fundHouse ?? '').localeCompare(right.fundHouse ?? '') ||
        left.name.localeCompare(right.name)
    );
}
