import { CategoryNewsSentiment } from './NewsSentiment';

/**
 * The app's window onto news, injected like `MarketDataPort` and `CodeRunner`:
 * the real implementation needs `fetch`, an API key and a cache, none of which
 * belongs in the domain layer or in a tool test.
 */

export interface NewsSummary {
  summaries: CategoryNewsSentiment[];
  /** Articles the fetch returned in total, before partitioning by category. */
  articlesConsidered: number;
  /** When the feed was fetched, so the reply can say how fresh it is. */
  fetchedAt: Date;
  source: string;
  /** Categories asked for that news cannot speak to, with the reason. */
  unavailable: { category: string; reason: string }[];
}

export interface NewsPort {
  /**
   * Never throws: a missing key, a spent quota and an unreachable provider all
   * come back as a reason in `unavailable`, because each of them is an ordinary
   * state here rather than an exception. There is deliberately no synchronous
   * `isConfigured` — it would need a second hydrate-on-ready settings cache
   * alongside `src/data/llm/state.ts`, and that invariant already has a footgun.
   */
  summarise(categories: string[]): Promise<NewsSummary>;
  /** Categories with a topic mapping, for the tool's argument hint. */
  supportedCategories(): string[];
}

/** Used when no key is configured or the provider cannot be reached. */
export function unavailableNews(reason: string): NewsPort {
  return {
    async summarise(categories) {
      return {
        summaries: [],
        articlesConsidered: 0,
        fetchedAt: new Date(0),
        source: 'none',
        unavailable: categories.map(category => ({ category, reason })),
      };
    },
    supportedCategories: () => [],
  };
}
