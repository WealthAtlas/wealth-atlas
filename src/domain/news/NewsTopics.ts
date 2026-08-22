import { AssetCategory } from '../entities/assets/AssetCategory';

/**
 * Which news topics bear on which asset category.
 *
 * The provider is queried **once** for the union of every topic here, and the
 * articles are partitioned to categories locally. That is not an optimisation:
 * the free tier allows 25 requests a day, so one request per category would
 * exhaust a day's quota in two questions. Fetching broadly and dividing in pure
 * code is also the testable arrangement — the mapping is data, not a query
 * string.
 *
 * Every topic string below was observed in a real API response, which is the
 * only reliable way to know a value is accepted: the published topic list is
 * behind a JS-rendered docs page, and an unrecognised topic risks failing the
 * whole request — the one request there is. Adding a topic means seeing it come
 * back from the API first.
 */

/** Topics seen emitted by the API, and therefore safe to ask for. */
export const NEWS_TOPICS = [
  'financial_markets',
  'economy_macro',
  'economy_fiscal',
  'finance',
  'earnings',
  'real_estate',
  'technology',
  'manufacturing',
  'retail_wholesale',
  'life_sciences',
  'mergers_and_acquisitions',
] as const;

export type NewsTopic = (typeof NEWS_TOPICS)[number];

/**
 * Categories are matched on the topics an article declares.
 *
 * Two honest gaps, reported rather than papered over. There is no commodities
 * topic, so Gold leans on the macro topics that actually move it — real rates
 * and fiscal policy — and its sample will be thin. There is no verified crypto
 * topic, so Cryptocurrency maps to the market-wide topics only. Fixed Deposit,
 * Pension and Cash are absent entirely: their value is contractual, and news
 * does not move it.
 */
export const CATEGORY_TOPICS: Readonly<Record<string, readonly NewsTopic[]>> = {
  [AssetCategory.INDEX_FUND]: ['financial_markets', 'economy_macro', 'earnings'],
  [AssetCategory.MUTUAL_FUNDS]: ['financial_markets', 'economy_macro', 'earnings'],
  [AssetCategory.STOCK]: ['financial_markets', 'earnings', 'economy_macro', 'technology'],
  [AssetCategory.DEBT]: ['economy_macro', 'economy_fiscal', 'finance'],
  [AssetCategory.GOLD]: ['economy_macro', 'economy_fiscal'],
  [AssetCategory.REAL_ESTATE]: ['real_estate', 'economy_macro'],
  [AssetCategory.CRYPTOCURRENCY]: ['financial_markets', 'technology'],
};

export function topicsForCategory(category: string): readonly NewsTopic[] {
  return CATEGORY_TOPICS[category] ?? [];
}

export function categoriesWithNews(): string[] {
  return Object.keys(CATEGORY_TOPICS);
}
