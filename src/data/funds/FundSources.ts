import { SeriesPoint } from '@/domain/market/NavSeries';
import { SchemeMeta, UniverseScheme } from '@/domain/funds/FundScreen';
import { fetchMarketJson, MarketSourceError } from '../market/MarketSources';

/**
 * Transport for AMFI's published scheme list, via the same `api.mfapi.in` mirror
 * the benchmark series already come from — keyless, and sending
 * `Access-Control-Allow-Origin: *`, which is what makes it callable from a page
 * at all.
 *
 * Three endpoints, and the shape of this module follows the shape of what they
 * cost:
 *
 * - `/mf` is the entire market: ~37,800 schemes, ~5.7MB, name and code only. One
 *   request, cached for a week — a new scheme launching is not news that has to
 *   arrive the same day.
 * - `/mf/{code}/latest` is ~300 bytes and carries what the list omits: fund
 *   house, the provider's own category string, and the newest NAV with its date.
 *   The date is the only available proof that a scheme is still running.
 * - `/mf/{code}` is the full NAV history, ~125KB. Only ever fetched for schemes
 *   the caller has named.
 *
 * There is no way to narrow the list at the source. There is no category
 * endpoint, `/mf` ignores every query parameter tried, and `/mf/search` is
 * hard-capped at 15 results regardless of what is asked for — so the whole list
 * is downloaded once and segmented locally.
 */

const HOST = 'https://api.mfapi.in';
export const FUND_SOURCE = 'api.mfapi.in';

/**
 * The scheme list is ~5.7MB, which is a slow read on a phone and not one worth
 * abandoning halfway — it is fetched roughly once a week.
 */
const LIST_TIMEOUT_MS = 60_000;

/**
 * How many metadata lookups may be in flight at once.
 *
 * A first screen of a segment costs one small request per matched scheme, which
 * is up to ~80. Deliberately modest: this is a community mirror with no SLA,
 * published as a courtesy, and the difference between six concurrent requests
 * and eighty is invisible to the user but not to the host.
 */
export const META_CONCURRENCY = 6;

interface ListRow {
  schemeCode?: number;
  schemeName?: string;
}

interface LatestResponse {
  meta?: {
    fund_house?: string;
    scheme_category?: string;
  };
  data?: { date?: string; nav?: string }[];
}

/** `DD-MM-YYYY`, as AMFI publishes it, to the `YYYY-MM-DD` a calendar day is. */
function toIsoDay(text: string | undefined): string | undefined {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text ?? '');
  return match ? `${match[3]}-${match[2]}-${match[1]}` : undefined;
}

export async function fetchSchemeList(): Promise<UniverseScheme[]> {
  const body = (await fetchMarketJson(`${HOST}/mf`, LIST_TIMEOUT_MS)) as ListRow[] | undefined;
  if (!Array.isArray(body) || body.length === 0) {
    throw new MarketSourceError('the source returned no scheme list');
  }

  const schemes = body
    .filter(
      (row): row is { schemeCode: number; schemeName: string } =>
        typeof row?.schemeCode === 'number' && typeof row?.schemeName === 'string'
    )
    .map(row => ({ code: row.schemeCode, name: row.schemeName }));

  // A list that parsed to nothing is a changed response shape, not an empty
  // market, and must not be cached as one.
  if (schemes.length === 0) {
    throw new MarketSourceError('no scheme in the list was readable');
  }
  return schemes;
}

export async function fetchSchemeMeta(code: number): Promise<SchemeMeta> {
  const body = (await fetchMarketJson(`${HOST}/mf/${encodeURIComponent(code)}/latest`)) as
    LatestResponse | undefined;

  const newest = body?.data?.[0];
  const nav = Number(newest?.nav);

  return {
    fundHouse: body?.meta?.fund_house,
    schemeCategory: body?.meta?.scheme_category,
    latestNav: Number.isFinite(nav) ? nav : undefined,
    navAsOf: toIsoDay(newest?.date),
  };
}

export async function fetchSchemeHistory(code: number): Promise<SeriesPoint[]> {
  const body = (await fetchMarketJson(`${HOST}/mf/${encodeURIComponent(code)}`)) as
    { data?: { date?: string; nav?: string }[] } | undefined;

  const rows = body?.data;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new MarketSourceError('the source returned no history');
  }

  // A missing or 'N.A.' NAV is a non-trading day, not a zero. `normaliseSeries`
  // drops the NaNs this produces rather than plotting them as a crash to zero.
  return rows.map(row => ({
    date: new Date(`${toIsoDay(row.date) ?? ''}T00:00:00.000Z`),
    value: Number(row.nav),
  }));
}
