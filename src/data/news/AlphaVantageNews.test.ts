import { describe, expect, it } from 'vitest';
import { buildFeedUrl, NewsSourceError, parseNewsResponse } from './AlphaVantageNews';

describe('buildFeedUrl', () => {
  it('sends no topic filter, because the provider ANDs them', () => {
    // This is the whole of the bug that once emptied the feed. The provider's
    // docs: `topics=technology,ipo` matches articles that "simultaneously cover
    // technology and IPO" — so asking for the union of every topic we partition
    // on asks for an article tagged with all fifteen, which does not exist. The
    // response was a valid `items: "0"` with an empty feed, and every layer
    // below reported it honestly as no news.
    expect(buildFeedUrl('k')).not.toContain('topics=');
  });

  it('asks for a page large enough to partition fifteen topics between', () => {
    // Unfiltered, the provider's default of 50 leaves most categories below
    // THIN_SAMPLE_BELOW — a sample too thin to read, for the same quota unit.
    const limit = Number(/[?&]limit=(\d+)/.exec(buildFeedUrl('k'))?.[1]);

    expect(limit).toBeGreaterThan(50);
    expect(limit).toBeLessThanOrEqual(1000); // the provider's stated maximum
  });

  it('escapes the key rather than pasting it into the query raw', () => {
    expect(buildFeedUrl('a&b=c')).toContain('apikey=a%26b%3Dc');
  });

  it('asks for the latest articles', () => {
    expect(buildFeedUrl('k')).toContain('sort=LATEST');
  });
});

/**
 * Shaped exactly like a real response, field names and string-typed numbers
 * included: the provider sends `overall_sentiment_score` and `relevance_score`
 * as numbers but `time_published` as an unpunctuated string with no zone, and
 * every one of those is a chance to read the feed wrong.
 */
const REAL_ITEM = {
  title: 'Apple cuts jobs in Siri and Vision Pro as it pivots to AI',
  url: 'https://example.test/aapl',
  time_published: '20260822T180659',
  authors: ['A Writer'],
  summary: 'A summary of the article.',
  banner_image: 'https://example.test/i.png',
  source: 'Example Wire',
  category_within_source: 'n/a',
  source_domain: 'example.test',
  topics: [
    { topic: 'technology', relevance_score: '1.000000' },
    { topic: 'financial_markets', relevance_score: '0.158519' },
  ],
  overall_sentiment_score: 0.083474,
  overall_sentiment_label: 'Neutral',
  ticker_sentiment: [
    {
      ticker: 'AAPL',
      relevance_score: '1.000000',
      ticker_sentiment_score: '0.061466',
      ticker_sentiment_label: 'Neutral',
    },
  ],
};

describe('parseNewsResponse', () => {
  it('reads a real feed item', () => {
    const [article] = parseNewsResponse({ items: '1', feed: [REAL_ITEM] });

    expect(article.title).toBe(REAL_ITEM.title);
    expect(article.source).toBe('Example Wire');
    expect(article.sentimentScore).toBeCloseTo(0.083474, 6);
    expect(article.sentimentLabel).toBe('Neutral');
    // Relevance arrives as a string and has to become a number, or every
    // weighted mean silently turns into NaN.
    expect(article.topics).toEqual([
      { topic: 'technology', relevance: 1 },
      { topic: 'financial_markets', relevance: 0.158519 },
    ]);
  });

  it('reads the unpunctuated zoneless timestamp as UTC', () => {
    const [article] = parseNewsResponse({ feed: [REAL_ITEM] });

    expect(article.publishedAt.toISOString()).toBe('2026-08-22T18:06:59.000Z');
  });

  it('drops an article with no usable sentiment score rather than scoring it zero', () => {
    // Defaulting would put an invented number into the mean.
    const articles = parseNewsResponse({
      feed: [
        { ...REAL_ITEM, overall_sentiment_score: undefined },
        { ...REAL_ITEM, overall_sentiment_score: 'not a number' },
        REAL_ITEM,
      ],
    });

    expect(articles).toHaveLength(1);
  });

  it('drops an article whose timestamp cannot be read', () => {
    const articles = parseNewsResponse({
      feed: [{ ...REAL_ITEM, time_published: '22-08-2026' }, REAL_ITEM],
    });

    expect(articles).toHaveLength(1);
  });

  it('drops a topic with an unreadable relevance instead of weighting it as zero', () => {
    const [article] = parseNewsResponse({
      feed: [
        {
          ...REAL_ITEM,
          topics: [
            { topic: 'technology', relevance_score: 'x' },
            { topic: 'earnings', relevance_score: '0.5' },
          ],
        },
      ],
    });

    expect(article.topics).toEqual([{ topic: 'earnings', relevance: 0.5 }]);
  });

  it('recognises a spent quota, which arrives as HTTP 200 with prose', () => {
    // The status code reveals nothing here — this is the expected daily failure.
    expect(() =>
      parseNewsResponse({
        Information:
          'Thank you for using Alpha Vantage! Our standard API rate limit is 25 requests per day.',
      })
    ).toThrow(/daily request limit is used up/);
  });

  it('recognises a rejected key, which arrives the same way', () => {
    expect(() =>
      parseNewsResponse({ Information: 'the parameter apikey is invalid or missing.' })
    ).toThrow(/rejected the API key/);
  });

  it('treats a Note and an Error Message as advisories too', () => {
    expect(() => parseNewsResponse({ Note: 'call frequency exceeded' })).toThrow(
      /daily request limit/
    );
    expect(() => parseNewsResponse({ 'Error Message': 'Invalid API call' })).toThrow(
      NewsSourceError
    );
  });

  it('rejects a body with no feed at all', () => {
    expect(() => parseNewsResponse({})).toThrow(/no articles/);
    expect(() => parseNewsResponse(undefined)).toThrow(/no articles/);
  });

  it('accepts an empty feed as an empty result, not a failure', () => {
    expect(parseNewsResponse({ feed: [] })).toEqual([]);
  });

  it('survives an article missing its optional fields', () => {
    const [article] = parseNewsResponse({
      feed: [{ title: 'Bare', time_published: '20260822T180659', overall_sentiment_score: -0.4 }],
    });

    expect(article.url).toBe('');
    expect(article.summary).toBe('');
    expect(article.topics).toEqual([]);
  });
});
