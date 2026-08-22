import { NewsTopic, topicsForCategory } from './NewsTopics';

/**
 * Turns a feed of articles into a *measurement* per asset category.
 *
 * The point of aggregating rather than forwarding headlines: a model handed 50
 * articles writes a story, and it will write an equally fluent story whichever
 * way the market moved. A model handed "23 articles, relevance-weighted mean
 * -0.21, Somewhat-Bearish, spanning the last 38 hours" has a number it can be
 * held to, and the headlines are attached underneath so it can cite one instead
 * of inventing one.
 *
 * Sentiment is weighted by the provider's own per-topic relevance score, not
 * counted. An article that mentions macro in passing should not carry the same
 * weight as one about nothing else, and counting articles is how a feed of
 * tangential mentions comes to look like conviction.
 */

export interface NewsArticle {
  title: string;
  url: string;
  source: string;
  /** When the article was published. */
  publishedAt: Date;
  summary: string;
  /** Provider sentiment for the article as a whole, -1..1. */
  sentimentScore: number;
  sentimentLabel: string;
  /** Per-topic relevance, 0..1, as the provider scored it. */
  topics: { topic: string; relevance: number }[];
}

export interface CategoryNewsSentiment {
  category: string;
  /** Articles that matched this category's topics. */
  articleCount: number;
  /**
   * Relevance-weighted mean sentiment, -1..1, or undefined when nothing
   * matched. Undefined rather than 0: no news is not neutral news.
   */
  meanSentiment?: number;
  /** The band `meanSentiment` falls in, using the provider's own thresholds. */
  label?: string;
  /** How the individual articles split, so a mean can be read in context. */
  distribution: { bullish: number; neutral: number; bearish: number };
  /** Publication window the matched articles actually cover. */
  newestAt?: Date;
  oldestAt?: Date;
  /**
   * True when too few articles matched for the mean to mean anything. The
   * figure is still reported — suppressing it would invite the model to fill
   * the gap from memory — but it must be quoted as a thin sample.
   */
  isThinSample: boolean;
  /** The most relevant articles, so a reply can cite rather than paraphrase. */
  topArticles: NewsArticle[];
}

/**
 * Below this, a mean is one or two opinions rather than a reading. Five is not
 * a statistical threshold, just the point where a single outlier stops setting
 * the direction on its own.
 */
export const THIN_SAMPLE_BELOW = 5;

const TOP_ARTICLES = 3;

/**
 * The provider's published bands, verbatim from its own
 * `sentiment_score_definition`:
 *
 *   x <= -0.35 Bearish; -0.35 < x <= -0.15 Somewhat-Bearish;
 *   -0.15 < x < 0.15 Neutral; 0.15 <= x < 0.35 Somewhat-Bullish;
 *   x >= 0.35 Bullish
 *
 * Reused rather than invented so an aggregate reads on the same scale as the
 * per-article labels beside it. Note the provider's definition string spells
 * the fourth band `Somewhat_Bullish` with an underscore while the feed itself
 * emits `Somewhat-Bullish` with a hyphen; the feed's spelling is the one used
 * here, because that is what the data actually contains.
 */
export function sentimentLabelFor(score: number): string {
  if (score <= -0.35) return 'Bearish';
  if (score <= -0.15) return 'Somewhat-Bearish';
  if (score < 0.15) return 'Neutral';
  if (score < 0.35) return 'Somewhat-Bullish';
  return 'Bullish';
}

/**
 * How strongly an article bears on a category: the highest relevance among the
 * category's topics. Max rather than sum — an article tagged with three of a
 * category's topics is not three times as relevant, and summing would let a
 * broadly-tagged article outweigh a dedicated one.
 */
function relevanceFor(article: NewsArticle, topics: readonly NewsTopic[]): number {
  let best = 0;
  for (const entry of article.topics) {
    if (!(topics as readonly string[]).includes(entry.topic)) continue;
    if (Number.isFinite(entry.relevance) && entry.relevance > best) best = entry.relevance;
  }
  return best;
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export function summariseCategoryNews(
  category: string,
  articles: NewsArticle[]
): CategoryNewsSentiment {
  const topics = topicsForCategory(category);

  const matched = articles
    .map(article => ({ article, relevance: relevanceFor(article, topics) }))
    .filter(entry => entry.relevance > 0);

  const distribution = { bullish: 0, neutral: 0, bearish: 0 };
  let weightedTotal = 0;
  let weightSum = 0;
  let newestAt: Date | undefined;
  let oldestAt: Date | undefined;

  for (const { article, relevance } of matched) {
    weightedTotal += article.sentimentScore * relevance;
    weightSum += relevance;

    // Counted on the article's own score, unweighted: the distribution answers
    // "how many articles lean which way", a different question from the mean.
    if (article.sentimentScore >= 0.15) distribution.bullish++;
    else if (article.sentimentScore <= -0.15) distribution.bearish++;
    else distribution.neutral++;

    if (!newestAt || article.publishedAt > newestAt) newestAt = article.publishedAt;
    if (!oldestAt || article.publishedAt < oldestAt) oldestAt = article.publishedAt;
  }

  const meanSentiment = weightSum > 0 ? round(weightedTotal / weightSum) : undefined;

  return {
    category,
    articleCount: matched.length,
    meanSentiment,
    label: meanSentiment === undefined ? undefined : sentimentLabelFor(meanSentiment),
    distribution,
    newestAt,
    oldestAt,
    isThinSample: matched.length < THIN_SAMPLE_BELOW,
    topArticles: matched
      .slice()
      .sort((left, right) => right.relevance - left.relevance)
      .slice(0, TOP_ARTICLES)
      .map(entry => entry.article),
  };
}

export function summariseNews(
  categories: string[],
  articles: NewsArticle[]
): CategoryNewsSentiment[] {
  return categories.map(category => summariseCategoryNews(category, articles));
}
