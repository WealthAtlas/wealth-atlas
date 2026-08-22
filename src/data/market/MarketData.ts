import { BenchmarkTrend, BenchmarkTrends, MarketDataPort } from '@/domain/market/MarketDataPort';
import { computeSeriesTrend, SeriesPoint } from '@/domain/market/NavSeries';
import { isoDate } from '@/domain/utils/DateUtils';
import { Logger } from '@/domain/utils/Logger';
import { Benchmark, benchmarkedCategories, benchmarkFor } from './Benchmarks';
import { fetchBenchmarkSeries, MarketSourceError } from './MarketSources';

/**
 * The real `MarketDataPort`: benchmark table, transport and a cache.
 *
 * Cached in memory only, deliberately, and for the same reason the conversation
 * is not persisted: a NAV series is external data the app can re-fetch at will,
 * so storing it would buy a stale-cache problem and cost a Dexie version, a
 * migration, and the snapshot and backup version bumps that would have to move
 * with it.
 *
 * The cache is keyed by benchmark rather than by category, because several
 * categories share one series — equity, index funds and mutual funds all read
 * Nifty 50 — which would otherwise be three identical 130KB downloads per
 * question.
 *
 * It expires on time rather than lasting the session. A NAV publishes once a
 * day, but this is an installed PWA that can stay open across a day boundary,
 * and a cache with no expiry would keep answering with yesterday's close
 * indefinitely while the reply's `asOf` date quietly went stale.
 */

/** Comfortably inside a publishing day, so a long-lived tab still refreshes. */
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

interface CacheEntry {
  fetchedAt: number;
  series: Promise<SeriesPoint[]>;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(benchmark: Benchmark): string {
  return `${benchmark.kind}:${benchmark.id}:${benchmark.currency}`;
}

function loadSeries(benchmark: Benchmark): Promise<SeriesPoint[]> {
  const key = cacheKey(benchmark);
  const cached = cache.get(key);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.series;

  const series = fetchBenchmarkSeries(benchmark);
  // A rejected promise must not stay cached, or one network blip keeps
  // answering "unavailable" for hours.
  series.catch(() => cache.delete(key));
  cache.set(key, { fetchedAt: Date.now(), series });
  return series;
}

async function trendFor(
  category: string,
  benchmark: Benchmark,
  windowDays: number
): Promise<BenchmarkTrend> {
  const series = await loadSeries(benchmark);
  const trend = computeSeriesTrend(series, windowDays);
  if (!trend) throw new MarketSourceError('the history contained no usable observations');

  return {
    category,
    benchmark: benchmark.label,
    source: benchmark.kind === 'mfapi' ? 'api.mfapi.in' : 'api.coingecko.com',
    currency: benchmark.currency,
    // The series' own last observation, never the clock: NAVs lag by a day or
    // more and the reply has to be able to say how stale the figure is.
    asOf: isoDate(trend.latestOn),
    trend,
  };
}

function describe(error: unknown): string {
  if (error instanceof MarketSourceError) return error.message;
  Logger.warn('Unexpected market data failure', error);
  return 'the lookup failed unexpectedly';
}

export function createMarketData(): MarketDataPort {
  return {
    async benchmarkTrends(categories, windowDays = 365): Promise<BenchmarkTrends> {
      const trends: BenchmarkTrend[] = [];
      const unavailable: { category: string; reason: string }[] = [];

      const requested = Array.from(new Set(categories));

      // Settled, not `all`: one dead source must not take the other categories
      // down with it, because a partial picture reported as partial is useful
      // and a missing one reported as nothing is not.
      const outcomes = await Promise.allSettled(
        requested.map(category => {
          const benchmark = benchmarkFor(category);
          if (!benchmark) {
            return Promise.reject(
              new MarketSourceError('no market benchmark describes this category')
            );
          }
          return trendFor(category, benchmark, windowDays);
        })
      );

      outcomes.forEach((outcome, index) => {
        if (outcome.status === 'fulfilled') {
          trends.push(outcome.value);
        } else {
          unavailable.push({ category: requested[index], reason: describe(outcome.reason) });
        }
      });

      return {
        // Deepest drawdown first: the category furthest below its own high is
        // the one the question is usually about.
        trends: trends.sort(
          (left, right) => left.trend.drawdownPercent - right.trend.drawdownPercent
        ),
        unavailable,
      };
    },

    supportedCategories: benchmarkedCategories,
  };
}
