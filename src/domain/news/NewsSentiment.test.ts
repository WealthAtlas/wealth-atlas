import { describe, expect, it } from 'vitest';
import { AssetCategory } from '../entities/assets/AssetCategory';
import {
  NewsArticle,
  sentimentLabelFor,
  summariseCategoryNews,
  summariseNews,
  THIN_SAMPLE_BELOW,
} from './NewsSentiment';

const PUBLISHED = new Date('2026-08-22T12:00:00.000Z');

function article(overrides: Partial<NewsArticle> = {}): NewsArticle {
  return {
    title: 'A headline',
    url: 'https://example.test/1',
    source: 'Example Wire',
    publishedAt: PUBLISHED,
    summary: 'A summary.',
    sentimentScore: 0,
    sentimentLabel: 'Neutral',
    topics: [{ topic: 'economy_macro', relevance: 1 }],
    ...overrides,
  };
}

/** Enough articles to clear the thin-sample threshold, all identical. */
function many(count: number, overrides: Partial<NewsArticle> = {}): NewsArticle[] {
  return Array.from({ length: count }, (_, index) =>
    article({ url: `https://example.test/${index}`, ...overrides })
  );
}

describe('sentimentLabelFor', () => {
  it('uses the provider’s own published bands', () => {
    expect(sentimentLabelFor(-0.5)).toBe('Bearish');
    expect(sentimentLabelFor(-0.35)).toBe('Bearish');
    expect(sentimentLabelFor(-0.2)).toBe('Somewhat-Bearish');
    expect(sentimentLabelFor(-0.15)).toBe('Somewhat-Bearish');
    expect(sentimentLabelFor(0)).toBe('Neutral');
    expect(sentimentLabelFor(0.1499)).toBe('Neutral');
    expect(sentimentLabelFor(0.15)).toBe('Somewhat-Bullish');
    expect(sentimentLabelFor(0.34)).toBe('Somewhat-Bullish');
    expect(sentimentLabelFor(0.35)).toBe('Bullish');
  });

  it('spells the bands the way the feed spells them', () => {
    // The provider's definition string says `Somewhat_Bullish` with an
    // underscore while its articles carry `Somewhat-Bullish`. Matching the data
    // rather than the documentation is what keeps an aggregate label comparable
    // with the per-article ones beside it.
    expect(sentimentLabelFor(0.2)).toBe('Somewhat-Bullish');
    expect(sentimentLabelFor(-0.2)).toBe('Somewhat-Bearish');
  });
});

describe('summariseCategoryNews', () => {
  it('reports no sentiment at all when nothing matched, rather than neutral', () => {
    const summary = summariseCategoryNews(AssetCategory.GOLD, [
      article({ topics: [{ topic: 'life_sciences', relevance: 1 }] }),
    ]);

    expect(summary.articleCount).toBe(0);
    expect(summary.meanSentiment).toBeUndefined();
    expect(summary.label).toBeUndefined();
    expect(summary.isThinSample).toBe(true);
  });

  it('ignores articles whose topics do not touch the category', () => {
    const summary = summariseCategoryNews(AssetCategory.REAL_ESTATE, [
      article({ topics: [{ topic: 'real_estate', relevance: 1 }], sentimentScore: -0.5 }),
      article({ topics: [{ topic: 'earnings', relevance: 1 }], sentimentScore: 0.9 }),
    ]);

    expect(summary.articleCount).toBe(1);
    expect(summary.meanSentiment).toBe(-0.5);
  });

  it('weights by relevance rather than counting articles', () => {
    // A tangential mention must not carry the same weight as a dedicated piece,
    // or a feed of passing references reads as conviction.
    const summary = summariseCategoryNews(AssetCategory.GOLD, [
      article({ sentimentScore: -0.8, topics: [{ topic: 'economy_macro', relevance: 1 }] }),
      article({ sentimentScore: 0.8, topics: [{ topic: 'economy_macro', relevance: 0.1 }] }),
    ]);

    // Unweighted this would be 0. Weighted: (-0.8*1 + 0.8*0.1) / 1.1
    expect(summary.meanSentiment).toBeCloseTo(-0.6545, 3);
    expect(summary.label).toBe('Bearish');
  });

  it('takes an article’s strongest matching topic, not the sum of them', () => {
    // Tagged with three of Debt's topics at low relevance each. Summing would
    // let it outweigh a single dedicated article; max must not.
    const broad = article({
      sentimentScore: 1,
      topics: [
        { topic: 'economy_macro', relevance: 0.3 },
        { topic: 'economy_fiscal', relevance: 0.3 },
        { topic: 'finance', relevance: 0.3 },
      ],
    });
    const focused = article({
      sentimentScore: -1,
      topics: [{ topic: 'economy_macro', relevance: 0.9 }],
    });

    const summary = summariseCategoryNews(AssetCategory.DEBT, [broad, focused]);

    // max: (1*0.3 + -1*0.9) / 1.2 = -0.5  (summing would have given +0.075)
    expect(summary.meanSentiment).toBeCloseTo(-0.5, 4);
  });

  it('counts the distribution unweighted, since it answers a different question', () => {
    const summary = summariseCategoryNews(AssetCategory.GOLD, [
      article({ sentimentScore: 0.5 }),
      article({ sentimentScore: 0.2 }),
      article({ sentimentScore: 0 }),
      article({ sentimentScore: -0.16 }),
      article({ sentimentScore: -0.6 }),
    ]);

    expect(summary.distribution).toEqual({ bullish: 2, neutral: 1, bearish: 2 });
  });

  it('flags a thin sample but still reports the figure', () => {
    const thin = summariseCategoryNews(AssetCategory.GOLD, many(THIN_SAMPLE_BELOW - 1));
    const enough = summariseCategoryNews(AssetCategory.GOLD, many(THIN_SAMPLE_BELOW));

    expect(thin.isThinSample).toBe(true);
    // Suppressing it would invite the model to fill the gap from memory.
    expect(thin.meanSentiment).toBeDefined();
    expect(enough.isThinSample).toBe(false);
  });

  it('reports the window the articles actually cover', () => {
    const older = new Date('2026-08-20T06:00:00.000Z');
    const newer = new Date('2026-08-22T18:00:00.000Z');
    const summary = summariseCategoryNews(AssetCategory.GOLD, [
      article({ publishedAt: older }),
      article({ publishedAt: newer }),
      article({ publishedAt: PUBLISHED }),
    ]);

    expect(summary.oldestAt).toEqual(older);
    expect(summary.newestAt).toEqual(newer);
  });

  it('returns the most relevant articles so a reply can cite one', () => {
    const summary = summariseCategoryNews(AssetCategory.GOLD, [
      article({ title: 'tangential', topics: [{ topic: 'economy_macro', relevance: 0.2 }] }),
      article({ title: 'central', topics: [{ topic: 'economy_macro', relevance: 0.95 }] }),
      article({ title: 'middling', topics: [{ topic: 'economy_macro', relevance: 0.5 }] }),
    ]);

    expect(summary.topArticles.map(entry => entry.title)).toEqual([
      'central',
      'middling',
      'tangential',
    ]);
  });

  it('ignores a relevance score that is not a usable number', () => {
    const summary = summariseCategoryNews(AssetCategory.GOLD, [
      article({ sentimentScore: 0.5, topics: [{ topic: 'economy_macro', relevance: Number.NaN }] }),
      article({ sentimentScore: -0.4, topics: [{ topic: 'economy_macro', relevance: 1 }] }),
    ]);

    expect(summary.articleCount).toBe(1);
    expect(summary.meanSentiment).toBe(-0.4);
  });

  it('has nothing to say about a category news cannot speak to', () => {
    const summary = summariseCategoryNews(AssetCategory.FIXED_DEPOSIT, many(10));

    expect(summary.articleCount).toBe(0);
    expect(summary.meanSentiment).toBeUndefined();
  });
});

describe('summariseNews', () => {
  it('partitions one feed across several categories', () => {
    const articles = [
      article({ topics: [{ topic: 'real_estate', relevance: 1 }], sentimentScore: -0.5 }),
      article({ topics: [{ topic: 'earnings', relevance: 1 }], sentimentScore: 0.5 }),
    ];

    const summaries = summariseNews([AssetCategory.REAL_ESTATE, AssetCategory.STOCK], articles);

    expect(summaries.map(entry => entry.meanSentiment)).toEqual([-0.5, 0.5]);
  });

  it('lets one article count for more than one category', () => {
    // A macro story bears on debt and on equity at once; partitioning is not a
    // split, and pretending otherwise would understate both.
    const articles = [
      article({ topics: [{ topic: 'economy_macro', relevance: 1 }], sentimentScore: -0.4 }),
    ];

    const summaries = summariseNews([AssetCategory.DEBT, AssetCategory.INDEX_FUND], articles);

    expect(summaries.every(entry => entry.articleCount === 1)).toBe(true);
  });
});
