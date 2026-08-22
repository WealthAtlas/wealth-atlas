import { NewsArticle } from '@/domain/news/NewsSentiment';
import { Logger } from '@/domain/utils/Logger';

/**
 * The fetched feed, cached in `localStorage`.
 *
 * Load-bearing, not an optimisation. The free tier allows 25 requests a day, so
 * an in-memory session cache — the choice made for market NAVs, where refetching
 * is free and unlimited — would spend the whole day's quota on 25 page reloads.
 * Surviving a reload is the entire point.
 *
 * `localStorage` rather than a Dexie table, deliberately. A cached public news
 * feed is not the user's data: it is device-local, has nothing to contribute to
 * a sync snapshot or a backup file, and would be actively wrong to restore from
 * one — a six-month-old backup would hand the assistant six-month-old headlines
 * as current. Keeping it out of Dexie also keeps it out of the four-way version
 * bump that a persisted row costs, which would buy nothing here.
 */

const STORAGE_KEY = 'news.feed.v1';

/**
 * Comfortably shorter than the quota window, so a day's normal use is a handful
 * of fetches, while news still turns over several times a day.
 */
const TTL_MS = 6 * 60 * 60 * 1000;

interface StoredFeed {
  fetchedAt: number;
  articles: (Omit<NewsArticle, 'publishedAt'> & { publishedAt: string })[];
}

export interface CachedFeed {
  articles: NewsArticle[];
  fetchedAt: Date;
}

export function readCachedFeed(now: number = Date.now()): CachedFeed | undefined {
  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Private browsing and blocked site data both throw rather than return null.
    return undefined;
  }
  if (!raw) return undefined;

  try {
    const stored = JSON.parse(raw) as StoredFeed;
    if (!Number.isFinite(stored.fetchedAt) || !Array.isArray(stored.articles)) return undefined;
    if (now - stored.fetchedAt >= TTL_MS) return undefined;

    // Dates went through JSON as strings, the same hazard `rehydrateSnapshotDates`
    // exists for on the Dexie side.
    return {
      fetchedAt: new Date(stored.fetchedAt),
      articles: stored.articles.map(article => ({
        ...article,
        publishedAt: new Date(article.publishedAt),
      })),
    };
  } catch (error) {
    Logger.warn('Discarding an unreadable cached news feed', error);
    return undefined;
  }
}

export function writeCachedFeed(articles: NewsArticle[], now: number = Date.now()): void {
  const stored: StoredFeed = {
    fetchedAt: now,
    articles: articles.map(article => ({
      ...article,
      publishedAt: article.publishedAt.toISOString(),
    })),
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch (error) {
    // A full or unavailable store costs a cache, not the feature.
    Logger.warn('Could not cache the news feed', error);
  }
}

export function clearCachedFeed(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do: the cache is best-effort by design.
  }
}
