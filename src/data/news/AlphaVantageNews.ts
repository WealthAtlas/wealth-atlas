import { NewsArticle } from '@/domain/news/NewsSentiment';
import { NEWS_TOPICS } from '@/domain/news/NewsTopics';
import { Logger } from '@/domain/utils/Logger';

/**
 * The news feed, from AlphaVantage's NEWS_SENTIMENT endpoint.
 *
 * Chosen over the alternatives on one hard criterion: it is the only news
 * source found that both sends `Access-Control-Allow-Origin: *` and returns
 * *structured* sentiment. GDELT rate-limits an unauthenticated caller and sends
 * no CORS header at all, and publisher RSS is almost universally CORS-blocked,
 * so neither can be read from a page. And a plain headline feed would leave the
 * model to judge tone from the wording, which is precisely the step worth not
 * delegating.
 *
 * One request per fetch, for the union of every topic. The free tier allows 25
 * requests a day and 5 a minute, so the quota — not latency — is what shapes
 * this: see `NewsCache`, which is load-bearing rather than an optimisation.
 */

const ENDPOINT = 'https://www.alphavantage.co/query';
const FETCH_TIMEOUT_MS = 15_000;

/** The most the free tier returns in one response. */
const ARTICLE_LIMIT = 50;

export class NewsSourceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NewsSourceError';
  }
}

interface AlphaVantageFeedItem {
  title?: string;
  url?: string;
  source?: string;
  time_published?: string;
  summary?: string;
  overall_sentiment_score?: number | string;
  overall_sentiment_label?: string;
  topics?: { topic?: string; relevance_score?: number | string }[];
}

interface AlphaVantageResponse {
  feed?: AlphaVantageFeedItem[];
  /** Present instead of a feed when the key is rejected or the quota is spent. */
  Information?: string;
  Note?: string;
  'Error Message'?: string;
}

/**
 * `YYYYMMDDTHHMMSS`, with no zone marker. Read as UTC: guessing a zone would
 * shift every timestamp by hours, and the figure this feeds is "how recent is
 * this news", where a consistent few-hour offset is far less misleading than a
 * date that lands on the wrong day.
 */
function parsePublishedAt(text: string | undefined): Date {
  const match = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})$/.exec(text ?? '');
  if (!match) return new Date(Number.NaN);
  const [, year, month, day, hour, minute, second] = match;
  return new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}.000Z`);
}

function asFiniteNumber(value: unknown): number | undefined {
  const numeric = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(numeric) ? numeric : undefined;
}

function toArticle(item: AlphaVantageFeedItem): NewsArticle | undefined {
  const publishedAt = parsePublishedAt(item.time_published);
  const sentimentScore = asFiniteNumber(item.overall_sentiment_score);

  // An article with no usable score or date cannot contribute to an aggregate,
  // and defaulting either one would put an invented number into the mean.
  if (!item.title || sentimentScore === undefined || Number.isNaN(publishedAt.getTime())) {
    return undefined;
  }

  return {
    title: item.title,
    url: item.url ?? '',
    source: item.source ?? 'unknown',
    publishedAt,
    summary: item.summary ?? '',
    sentimentScore,
    sentimentLabel: item.overall_sentiment_label ?? '',
    topics: (item.topics ?? []).flatMap(entry => {
      const relevance = asFiniteNumber(entry.relevance_score);
      if (!entry.topic || relevance === undefined) return [];
      return [{ topic: entry.topic, relevance }];
    }),
  };
}

/**
 * Reads a response body into articles, or throws `NewsSourceError` with a
 * message fit to show the user.
 *
 * Separate from the fetch so the risky half — the provider's own conventions,
 * which are where this breaks — is testable without a network. Those conventions
 * are unusual enough to be worth naming: a rejected key and a spent quota both
 * arrive as HTTP 200 with a prose field instead of a feed, so the status code
 * reveals neither.
 */
export function parseNewsResponse(body: unknown): NewsArticle[] {
  const response = (body ?? {}) as AlphaVantageResponse;

  const advisory = response.Information ?? response.Note ?? response['Error Message'];
  if (advisory) {
    Logger.warn('News provider declined the request', advisory);
    throw new NewsSourceError(
      /limit|frequency|quota/i.test(advisory)
        ? 'the news provider’s daily request limit is used up — it resets tomorrow'
        : 'the news provider rejected the API key'
    );
  }

  if (!Array.isArray(response.feed)) {
    throw new NewsSourceError('the news provider returned no articles');
  }

  return response.feed.flatMap(item => {
    const article = toArticle(item);
    return article ? [article] : [];
  });
}

/**
 * Fetches the feed. Throws `NewsSourceError` with a message fit to show the
 * user — a spent quota is the expected failure here, not an exceptional one.
 */
export async function fetchNewsFeed(apiKey: string): Promise<NewsArticle[]> {
  const url =
    `${ENDPOINT}?function=NEWS_SENTIMENT` +
    `&topics=${NEWS_TOPICS.join(',')}` +
    `&sort=LATEST&limit=${ARTICLE_LIMIT}` +
    `&apikey=${encodeURIComponent(apiKey)}`;

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  } catch (error) {
    throw new NewsSourceError(
      error instanceof Error && error.name === 'TimeoutError'
        ? 'the news provider did not respond in time'
        : 'the news provider could not be reached'
    );
  }

  if (!response.ok) {
    throw new NewsSourceError(`the news provider answered ${response.status}`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new NewsSourceError('the news provider did not return JSON');
  }

  return parseNewsResponse(body);
}
