import { Currency } from '../entities/shared/Currency';
import { SeriesTrend } from './NavSeries';

/**
 * The app's window onto outside market data, injected into the chat tool
 * context the way `CodeRunner` is: the real implementation needs `fetch` and a
 * cache, which would put transport in the domain layer and make every tool test
 * need a network.
 *
 * Two deliberate limits on what this port can express.
 *
 * It reports **benchmarks per asset category**, not per holding. Nothing in
 * `IAsset` identifies the instrument it tracks — there is no scheme code or
 * ticker column — so matching a user's asset to a traded instrument means
 * guessing from its name, and a wrong guess would attach a real price series to
 * the wrong holding and read as fact. A category benchmark makes a weaker claim
 * that is actually true: "Indian large-cap equity is 7% off its high" is the
 * macro fact the buy-the-dip question turns on, and it needs no per-asset
 * mapping at all.
 *
 * And it reports only **numbers with a date and a source**. No forecasts, no
 * sentiment, no narrative. A model handed a price series can be held to it; a
 * model handed a story will produce an equally confident story either way.
 */

export interface BenchmarkTrend {
  /** The asset category this benchmark stands in for. */
  category: string;
  /** What was actually measured, for attribution in the reply. */
  benchmark: string;
  /** Where the series came from, e.g. `api.mfapi.in`. */
  source: string;
  currency: Currency;
  /** Date of the newest observation, as `YYYY-MM-DD`. Never the clock. */
  asOf: string;
  trend: SeriesTrend;
}

export interface BenchmarkTrends {
  trends: BenchmarkTrend[];
  /**
   * Categories asked for that could not be answered, with the reason.
   *
   * Explicit for the same reason `unratedCurrencies` is: a silently missing
   * benchmark makes an incomplete picture look complete, and the one category
   * that failed to load is exactly the one whose absence changes the advice.
   */
  unavailable: { category: string; reason: string }[];
}

export interface MarketDataPort {
  /**
   * Trend for each category that has a benchmark, over the given window.
   * Never throws for a single failed source — a failure is reported in
   * `unavailable` so the rest of the answer still stands.
   */
  benchmarkTrends(categories: string[], windowDays?: number): Promise<BenchmarkTrends>;
  /** Categories this port can report on at all, for the tool's argument hint. */
  supportedCategories(): string[];
}

/**
 * Stand-in for when no market data is configured or reachable. Reports every
 * category as unavailable rather than pretending the market is flat.
 */
export function unavailableMarketData(reason: string): MarketDataPort {
  return {
    async benchmarkTrends(categories) {
      return {
        trends: [],
        unavailable: categories.map(category => ({ category, reason })),
      };
    },
    supportedCategories: () => [],
  };
}
