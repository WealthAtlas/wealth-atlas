import { SeriesTrend } from '../market/NavSeries';
import { FundCandidate } from './FundScreen';

/**
 * The app's window onto the fund universe — every scheme on the market, not
 * just the ones the user holds.
 *
 * Injected like `MarketDataPort` and for the same reason: the real
 * implementation needs `fetch` and two caches, which would put transport in the
 * domain layer and make every tool test need a network.
 *
 * The division of labour between the two methods is the load-bearing part.
 *
 * `screenSegment` names funds and costs almost nothing — it answers from a
 * cached copy of the published scheme list plus cached per-scheme metadata — but
 * it deliberately reports **no performance figure at all**. `compareFunds`
 * fetches real NAV history, so it is bounded to schemes the caller has named.
 *
 * That split is what keeps the feature affordable and honest at once. A segment
 * holds up to ~80 schemes and each history is ~125KB, so screening a segment
 * *with* performance would be a 10MB download on a phone; and a segment listed
 * in performance order would read as a ranking of fund quality, which trailing
 * NAV growth is not. Naming the real, currently-running funds is the part the
 * model cannot do from memory. Judging them is a separate question, asked about
 * a shortlist.
 */

export interface SegmentScreen {
  /** The segment asked for, as this port names it. */
  segment: string;
  /** The asset category a holding here would be recorded under. */
  category: string;
  /** The provider's own category string for this segment, for comparison. */
  sebiCategoryHint: string;
  candidates: FundCandidate[];
  /** Schemes matched but excluded because they have stopped publishing a NAV. */
  discardedAsStale: number;
  /** True when more schemes matched than the port will report. */
  truncated: boolean;
  totalMatched: number;
  source: string;
  /** When the underlying scheme list was fetched. */
  universeFetchedAt: Date;
}

export interface FundTrend {
  code: number;
  name: string;
  fundHouse?: string;
  schemeCategory?: string;
  /** Date of the newest observation, as `YYYY-MM-DD`. Never the clock. */
  asOf: string;
  trend: SeriesTrend;
}

export interface FundTrends {
  funds: FundTrend[];
  /**
   * Schemes asked for that could not be answered, with the reason. Explicit for
   * the same reason `BenchmarkTrends.unavailable` is: the one candidate whose
   * history failed to load is exactly the one whose absence changes the
   * shortlist.
   */
  unavailable: { code: number; reason: string }[];
  source: string;
}

export interface FundUniversePort {
  /** Segments this port can screen at all, for the tool's argument hint. */
  screenableSegments(): string[];
  /**
   * Live schemes in a segment. Never throws for a single failed metadata
   * lookup — that scheme is simply absent, the way an unknown liveness is
   * treated as stale.
   */
  screenSegment(segment: string, today: Date): Promise<SegmentScreen>;
  /** NAV-derived figures for named schemes, over a window in days. */
  compareFunds(codes: number[], windowDays?: number): Promise<FundTrends>;
}

/**
 * Stand-in for when the universe cannot be reached. Reports an empty screen
 * with a reason rather than an empty market — "no funds match" and "the list
 * could not be loaded" must never look the same to the model.
 */
export function unavailableFundUniverse(reason: string): FundUniversePort {
  return {
    screenableSegments: () => [],
    async screenSegment(segment) {
      throw new Error(`${segment} could not be screened: ${reason}`);
    },
    async compareFunds(codes) {
      return {
        funds: [],
        unavailable: codes.map(code => ({ code, reason })),
        source: 'unavailable',
      };
    },
  };
}
