import { SeriesPoint } from '@/domain/market/NavSeries';
import { Benchmark } from './Benchmarks';

/**
 * Transport for the two market series this app can reach from a browser.
 *
 * Both are keyless and both send `Access-Control-Allow-Origin: *`, which is why
 * they were chosen over the better-known alternatives: Yahoo Finance and Stooq
 * send no CORS header at all, and GDELT rate-limits an unauthenticated caller,
 * so none of them can be called from a page. AlphaVantage does send the header
 * and is the natural next source, but it needs a key and a tight daily quota,
 * so it belongs with the news layer rather than here.
 *
 * `api.mfapi.in` is a community mirror of AMFI's daily NAV publication with no
 * SLA. A failure is therefore expected occasionally and is reported as an
 * unavailable category, never as a flat market.
 */

/** Long enough for a 130KB NAV history on a slow connection, short enough that
 * a hung request cannot hang the assistant's turn. */
const FETCH_TIMEOUT_MS = 15_000;

export class MarketSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MarketSourceError';
  }
}

/**
 * Exported for `src/data/funds/`, which reads the same host under the same
 * failure semantics. Shared rather than copied because the interesting part is
 * not the fetch — it is that a CORS rejection and an offline device are
 * indistinguishable here, and both must be reported as what is verifiable.
 */
export async function fetchMarketJson(url: string, timeoutMs = FETCH_TIMEOUT_MS): Promise<unknown> {
  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    // A CORS rejection and an offline device are indistinguishable here, so the
    // message says what is verifiable rather than guessing which it was.
    throw new MarketSourceError(
      error instanceof Error && error.name === 'TimeoutError'
        ? 'the source did not respond in time'
        : 'the source could not be reached'
    );
  }

  if (!response.ok) {
    throw new MarketSourceError(`the source answered ${response.status}`);
  }

  try {
    return await response.json();
  } catch {
    throw new MarketSourceError('the source did not return JSON');
  }
}

/** `DD-MM-YYYY`, as AMFI publishes it, read as UTC so no timezone shifts it. */
function parseAmfiDate(text: string): Date {
  const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(text);
  if (!match) return new Date(Number.NaN);
  return new Date(`${match[3]}-${match[2]}-${match[1]}T00:00:00.000Z`);
}

interface MfApiResponse {
  meta?: { scheme_name?: string };
  data?: { date?: string; nav?: string }[];
}

async function fetchMfApiSeries(schemeCode: string): Promise<SeriesPoint[]> {
  const body = (await fetchMarketJson(
    `https://api.mfapi.in/mf/${encodeURIComponent(schemeCode)}`
  )) as MfApiResponse | undefined;

  const rows = body?.data;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new MarketSourceError('the source returned no history');
  }

  // A missing or 'N.A.' NAV is a non-trading day, not a zero. `normaliseSeries`
  // drops the NaNs this produces rather than plotting them as a crash to zero.
  return rows.map(row => ({
    date: parseAmfiDate(row.date ?? ''),
    value: Number(row.nav),
  }));
}

interface CoinGeckoResponse {
  prices?: [number, number][];
}

async function fetchCoinGeckoSeries(coinId: string, currency: string): Promise<SeriesPoint[]> {
  const body = (await fetchMarketJson(
    `https://api.coingecko.com/api/v3/coins/${encodeURIComponent(coinId)}/market_chart` +
      `?vs_currency=${encodeURIComponent(currency.toLowerCase())}&days=365&interval=daily`
  )) as CoinGeckoResponse | undefined;

  const prices = body?.prices;
  if (!Array.isArray(prices) || prices.length === 0) {
    throw new MarketSourceError('the source returned no history');
  }

  return prices.map(([timestamp, value]) => ({ date: new Date(timestamp), value }));
}

export async function fetchBenchmarkSeries(benchmark: Benchmark): Promise<SeriesPoint[]> {
  switch (benchmark.kind) {
    case 'mfapi':
      return fetchMfApiSeries(benchmark.id);
    case 'coingecko':
      return fetchCoinGeckoSeries(benchmark.id, benchmark.currency);
  }
}
