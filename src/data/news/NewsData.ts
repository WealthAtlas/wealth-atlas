import { SettingsRepository } from '@/data/repositories/settings/SettingsRepository';
import { NewsPort, NewsSummary } from '@/domain/news/NewsPort';
import { summariseNews } from '@/domain/news/NewsSentiment';
import { categoriesWithNews, topicsForCategory } from '@/domain/news/NewsTopics';
import { Logger } from '@/domain/utils/Logger';
import { fetchNewsFeed, NewsSourceError } from './AlphaVantageNews';
import { CachedFeed, readCachedFeed, writeCachedFeed } from './NewsCache';

/**
 * The real `NewsPort`: read the key, serve the cache, fetch once if it is cold,
 * and aggregate in the domain layer.
 *
 * The whole feed is fetched and partitioned locally rather than queried per
 * category — see `NewsTopics` for why the 25-a-day quota forces that — so a
 * question about three categories still costs at most one request.
 */

/** Collapses concurrent callers onto one request, which is one quota unit. */
let inFlight: Promise<CachedFeed> | undefined;

async function loadFeed(apiKey: string): Promise<CachedFeed> {
  const cached = readCachedFeed();
  if (cached) return cached;

  // Two tools asking in the same turn must not each spend a request.
  inFlight ??= fetchNewsFeed(apiKey)
    .then(articles => {
      writeCachedFeed(articles);
      return { articles, fetchedAt: new Date() };
    })
    .finally(() => {
      inFlight = undefined;
    });

  return inFlight;
}

function describe(error: unknown): string {
  if (error instanceof NewsSourceError) return error.message;
  Logger.warn('Unexpected news failure', error);
  return 'the news lookup failed unexpectedly';
}

function allUnavailable(categories: string[], reason: string): NewsSummary {
  return {
    summaries: [],
    articlesConsidered: 0,
    fetchedAt: new Date(0),
    source: 'www.alphavantage.co',
    unavailable: categories.map(category => ({ category, reason })),
  };
}

export function createNewsData(): NewsPort {
  const settingsRepository = new SettingsRepository();

  return {
    async summarise(categories): Promise<NewsSummary> {
      const requested = Array.from(new Set(categories));

      const apiKey = (await settingsRepository.get()).news?.apiKey;
      if (!apiKey) {
        return allUnavailable(
          requested,
          'no news provider is configured — add an AlphaVantage API key in Settings'
        );
      }

      // Categories news cannot speak to are separated before the fetch, so a
      // question only about fixed deposits never spends a request at all.
      const covered = requested.filter(category => topicsForCategory(category).length > 0);
      const uncovered = requested
        .filter(category => topicsForCategory(category).length === 0)
        .map(category => ({
          category,
          reason: 'news does not move this category — its value is contractual',
        }));

      if (covered.length === 0) {
        return { ...allUnavailable([], ''), unavailable: uncovered };
      }

      let feed: CachedFeed;
      try {
        feed = await loadFeed(apiKey);
      } catch (error) {
        const reason = describe(error);
        return {
          ...allUnavailable(covered, reason),
          unavailable: [...covered.map(category => ({ category, reason })), ...uncovered],
        };
      }

      return {
        summaries: summariseNews(covered, feed.articles),
        articlesConsidered: feed.articles.length,
        fetchedAt: feed.fetchedAt,
        source: 'www.alphavantage.co',
        unavailable: uncovered,
      };
    },

    supportedCategories: categoriesWithNews,
  };
}
