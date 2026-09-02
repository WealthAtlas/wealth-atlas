import { describe, expect, it } from 'vitest';
import { AssetCategory } from '../entities/assets/AssetCategory';
import { CATEGORY_TOPICS, categoriesWithNews, NEWS_TOPICS, topicsForCategory } from './NewsTopics';

describe('the news topic mapping', () => {
  it('only maps categories to topics the provider actually emits', () => {
    // NEWS_TOPICS is the provider's published vocabulary. A category mapped to a
    // topic outside it — a typo, or a name invented from memory — would match
    // nothing, for ever, with no error anywhere: it would simply report "no
    // news" and look like a quiet news day.
    const vocabulary = new Set<string>(NEWS_TOPICS);

    for (const [category, topics] of Object.entries(CATEGORY_TOPICS)) {
      for (const topic of topics) {
        expect(vocabulary, `${category} -> "${topic}" is not a real topic`).toContain(topic);
      }
    }
  });

  it('keys every entry by a real asset category', () => {
    const categories = new Set<string>(Object.values(AssetCategory));

    for (const key of Object.keys(CATEGORY_TOPICS)) {
      expect(categories, `"${key}" is not an AssetCategory value`).toContain(key);
    }
  });

  it('gives every mapped category at least one topic', () => {
    for (const category of categoriesWithNews()) {
      expect(topicsForCategory(category).length, category).toBeGreaterThan(0);
    }
  });

  it('has no duplicate topics within a category, which would skew nothing but confuse', () => {
    for (const [category, topics] of Object.entries(CATEGORY_TOPICS)) {
      expect(new Set(topics).size, category).toBe(topics.length);
    }
  });

  it('leaves categories news cannot move without a mapping', () => {
    // A fixed deposit and a pension pay what the contract says regardless of
    // the headlines, and cash does not move at all.
    for (const category of [
      AssetCategory.FIXED_DEPOSIT,
      AssetCategory.PENSION,
      AssetCategory.CASH,
      AssetCategory.OTHER,
    ]) {
      expect(topicsForCategory(category), category).toEqual([]);
    }
  });

  it('lists no duplicate topics', () => {
    expect(new Set(NEWS_TOPICS).size).toBe(NEWS_TOPICS.length);
  });

  it('reads the rate-sensitive categories off monetary policy', () => {
    // Interest rates and inflation are what move a bond fund and the gold price,
    // and `economy_monetary` is the topic carrying them. Its earlier absence
    // left Debt and Gold reading the metal and the curve through fiscal and
    // macro coverage only.
    for (const category of [AssetCategory.DEBT, AssetCategory.GOLD]) {
      expect(topicsForCategory(category), category).toContain('economy_monetary');
    }
  });
});
