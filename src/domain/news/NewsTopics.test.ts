import { describe, expect, it } from 'vitest';
import { AssetCategory } from '../entities/assets/AssetCategory';
import { CATEGORY_TOPICS, categoriesWithNews, NEWS_TOPICS, topicsForCategory } from './NewsTopics';

describe('the news topic mapping', () => {
  it('only maps categories to topics that are actually fetched', () => {
    // The single request asks for NEWS_TOPICS. A category mapped to a topic
    // outside that set would match nothing, for ever, with no error anywhere —
    // it would simply report "no news" and look like a quiet news day.
    const fetched = new Set<string>(NEWS_TOPICS);

    for (const [category, topics] of Object.entries(CATEGORY_TOPICS)) {
      for (const topic of topics) {
        expect(fetched, `${category} -> "${topic}" is never fetched`).toContain(topic);
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

  it('asks for no duplicate topics, since the quota is 25 requests a day', () => {
    expect(new Set(NEWS_TOPICS).size).toBe(NEWS_TOPICS.length);
  });
});
