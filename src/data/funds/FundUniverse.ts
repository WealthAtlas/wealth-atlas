import {
  FundCandidate,
  isStale,
  matchSegment,
  pruneUniverse,
  SchemeMeta,
  UniverseScheme,
} from '@/domain/funds/FundScreen';
import { FUND_SEGMENTS, segmentFor, segmentNames } from '@/domain/funds/FundSegments';
import { sortCandidates } from '@/domain/funds/FundScreen';
import {
  FundTrend,
  FundTrends,
  FundUniversePort,
  SegmentScreen,
} from '@/domain/funds/FundUniversePort';
import { computeSeriesTrend, SeriesPoint } from '@/domain/market/NavSeries';
import { isoDate } from '@/domain/utils/DateUtils';
import { Logger } from '@/domain/utils/Logger';
import { MarketSourceError } from '../market/MarketSources';
import {
  readCachedMeta,
  readCachedUniverse,
  writeCachedMeta,
  writeCachedUniverse,
} from './FundUniverseCache';
import {
  fetchSchemeHistory,
  fetchSchemeList,
  fetchSchemeMeta,
  FUND_SOURCE,
  mapWithConcurrency,
} from './FundSources';

/**
 * The real `FundUniversePort`: the published scheme list, the segment table,
 * transport and two caches.
 *
 * `MAX_CANDIDATES` bounds a screen. Every segment verified against the live list
 * matches well inside it — the largest, Gilt, is 81 — because SEBI permits one
 * scheme per category per fund house, so a segment's size is roughly the number
 * of fund houses. A segment that overflowed would mean the pattern had stopped
 * describing a segment, so the cap reports `truncated` rather than silently
 * shortening the list.
 */
const MAX_CANDIDATES = 100;

/** Never fetch more histories than this in one comparison — ~125KB each. */
const MAX_COMPARED = 10;

/**
 * NAV histories, cached in memory only — the choice `MarketData` makes and for
 * the same reason. A history is external data the app can re-fetch at will, and
 * it is far too large to sit in the `localStorage` budget the scheme list and
 * its metadata are already spending.
 */
const HISTORY_TTL_MS = 6 * 60 * 60 * 1000;

const historyCache = new Map<number, { fetchedAt: number; series: Promise<SeriesPoint[]> }>();

function loadHistory(code: number): Promise<SeriesPoint[]> {
  const cached = historyCache.get(code);
  if (cached && Date.now() - cached.fetchedAt < HISTORY_TTL_MS) return cached.series;

  const series = fetchSchemeHistory(code);
  // A rejected promise must not stay cached, or one network blip keeps
  // answering "unavailable" for hours.
  series.catch(() => historyCache.delete(code));
  historyCache.set(code, { fetchedAt: Date.now(), series });
  return series;
}

/** One in-flight list fetch at most, so two tools in one turn cost one download. */
let pendingList: Promise<{ schemes: UniverseScheme[]; fetchedAt: Date }> | undefined;

async function loadUniverse(): Promise<{ schemes: UniverseScheme[]; fetchedAt: Date }> {
  const cached = readCachedUniverse();
  if (cached) return cached;

  pendingList ??= (async () => {
    try {
      // Pruned before caching: the stored copy is what the screen reads, and the
      // full list does not fit the storage budget.
      const pruned = pruneUniverse(await fetchSchemeList());
      const fetchedAt = new Date();
      writeCachedUniverse(pruned, fetchedAt.getTime());
      return { schemes: pruned, fetchedAt };
    } finally {
      pendingList = undefined;
    }
  })();

  return pendingList;
}

async function loadMeta(codes: number[]): Promise<Map<number, SchemeMeta>> {
  const cached = readCachedMeta(codes);
  const missing = codes.filter(code => !cached.has(code));
  if (missing.length === 0) return cached;

  const outcomes = await mapWithConcurrency(missing, fetchSchemeMeta);
  const fetched = new Map<number, SchemeMeta>();

  outcomes.forEach((outcome, index) => {
    if (outcome.status === 'fulfilled') {
      fetched.set(missing[index], outcome.value);
    } else {
      // A scheme whose metadata will not load has an unknown liveness, which
      // `isStale` already treats as stale. Nothing to report per-scheme here.
      Logger.warn(`Could not read metadata for scheme ${missing[index]}`, outcome.reason);
    }
  });

  writeCachedMeta(fetched);
  return new Map([...cached, ...fetched]);
}

function describe(error: unknown): string {
  if (error instanceof MarketSourceError) return error.message;
  Logger.warn('Unexpected fund universe failure', error);
  return 'the lookup failed unexpectedly';
}

export function createFundUniverse(): FundUniversePort {
  return {
    screenableSegments: segmentNames,

    async screenSegment(name, today): Promise<SegmentScreen> {
      const segment = segmentFor(name);
      if (!segment) {
        throw new MarketSourceError(
          `"${name}" is not a segment this app can screen. Known segments: ${segmentNames().join(', ')}`
        );
      }

      const { schemes, fetchedAt } = await loadUniverse();
      const matched = matchSegment(schemes, segment);
      const considered = matched.slice(0, MAX_CANDIDATES);
      const meta = await loadMeta(considered.map(scheme => scheme.code));

      const candidates: FundCandidate[] = [];
      let discardedAsStale = 0;

      for (const scheme of considered) {
        const entry = meta.get(scheme.code);
        if (isStale(entry?.navAsOf, today)) {
          // A scheme that has stopped publishing a NAV has been wound up or
          // merged. It still lists under a name that reads perfectly current,
          // so this is the only thing standing between the screen and a
          // recommendation to buy a fund that no longer exists.
          discardedAsStale++;
          continue;
        }
        candidates.push({ ...scheme, ...entry });
      }

      return {
        segment: segment.name,
        category: segment.category,
        sebiCategoryHint: segment.sebiCategoryHint,
        candidates: sortCandidates(candidates),
        discardedAsStale,
        truncated: matched.length > considered.length,
        totalMatched: matched.length,
        source: FUND_SOURCE,
        universeFetchedAt: fetchedAt,
      };
    },

    async compareFunds(codes, windowDays = 365): Promise<FundTrends> {
      const requested = Array.from(new Set(codes)).slice(0, MAX_COMPARED);
      const { schemes } = await loadUniverse();
      const byCode = new Map(schemes.map(scheme => [scheme.code, scheme.name]));
      const meta = await loadMeta(requested);

      const outcomes = await mapWithConcurrency(requested, async code => {
        const series = await loadHistory(code);
        const trend = computeSeriesTrend(series, windowDays);
        if (!trend) throw new MarketSourceError('the history contained no usable observations');

        const entry = meta.get(code);
        return {
          code,
          name: byCode.get(code) ?? `scheme ${code}`,
          fundHouse: entry?.fundHouse,
          schemeCategory: entry?.schemeCategory,
          // The series' own last observation, never the clock: NAVs lag by a day
          // or more and the reply has to be able to say how stale the figure is.
          asOf: isoDate(trend.latestOn),
          trend,
        } satisfies FundTrend;
      });

      const funds: FundTrend[] = [];
      const unavailable: { code: number; reason: string }[] = [];

      outcomes.forEach((outcome, index) => {
        if (outcome.status === 'fulfilled') {
          funds.push(outcome.value);
        } else {
          unavailable.push({ code: requested[index], reason: describe(outcome.reason) });
        }
      });

      return { funds, unavailable, source: FUND_SOURCE };
    },
  };
}

/** Exported for the segment table's test, which asserts it stays non-empty. */
export const SCREENABLE_SEGMENT_COUNT = FUND_SEGMENTS.length;
