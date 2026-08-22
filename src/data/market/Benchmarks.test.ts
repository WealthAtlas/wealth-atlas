import { describe, expect, it } from 'vitest';
import { AssetCategory } from '@/domain/entities/assets/AssetCategory';
import { benchmarkedCategories, benchmarkFor, CATEGORY_BENCHMARKS } from './Benchmarks';

/**
 * The table is keyed by `AssetCategory` *value*, and a typo in a key would not
 * fail to compile — it would silently mean "this category has no benchmark",
 * forever, with no error anywhere. That is the whole reason this suite exists.
 */
describe('the benchmark table', () => {
  it('keys every entry by a real asset category', () => {
    const categories = new Set<string>(Object.values(AssetCategory));

    for (const key of Object.keys(CATEGORY_BENCHMARKS)) {
      expect(categories, `"${key}" is not an AssetCategory value`).toContain(key);
    }
  });

  it('gives every entry an id, a label and a currency', () => {
    for (const [category, benchmark] of Object.entries(CATEGORY_BENCHMARKS)) {
      expect(benchmark.id, category).not.toBe('');
      // The label is quoted in replies as the thing measured, so a bare scheme
      // code would be useless to the reader.
      expect(benchmark.label.length, category).toBeGreaterThan(8);
      expect(benchmark.currency, category).toMatch(/^[A-Z]{3}$/);
    }
  });

  it('leaves categories no market series describes without a benchmark', () => {
    // Deliberate absences, recorded so that adding one becomes a decision
    // rather than an accident. A fixed deposit and a pension are contractual
    // rather than marked to market, no free per-property series exists for real
    // estate, and cash does not move.
    for (const category of [
      AssetCategory.FIXED_DEPOSIT,
      AssetCategory.PENSION,
      AssetCategory.REAL_ESTATE,
      AssetCategory.CASH,
      AssetCategory.OTHER,
    ]) {
      expect(benchmarkFor(category), category).toBeUndefined();
    }
  });

  it('covers the categories a market trend is actually asked about', () => {
    const covered = benchmarkedCategories();

    expect(covered).toContain(AssetCategory.INDEX_FUND);
    expect(covered).toContain(AssetCategory.STOCK);
    expect(covered).toContain(AssetCategory.DEBT);
    expect(covered).toContain(AssetCategory.GOLD);
  });
});
