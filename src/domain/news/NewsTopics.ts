import { AssetCategory } from '../entities/assets/AssetCategory';

/**
 * Which news topics bear on which asset category.
 *
 * The provider is queried **once**, with no topic filter, and the articles are
 * partitioned to categories here. That is not an optimisation: the free tier
 * allows 25 requests a day, so one request per topic would exhaust a day's quota
 * in a single question. Dividing in pure code is also the testable arrangement —
 * the mapping is data, not a query string.
 *
 * It is not merely the cheaper arrangement, it is the only one that works. The
 * provider ANDs a multi-topic filter, so asking for the union below returns
 * nothing at all; `AlphaVantageNews` carries that note in full. Each article
 * declares its own topics with a relevance score, and that is what
 * `summariseCategoryNews` reads.
 */

/**
 * The provider's published topic vocabulary, verbatim and complete.
 *
 * Nothing is *sent* to the API any more, so this is no longer a query — it is
 * the set of strings the feed can actually contain, and a category mapped to
 * anything outside it would match nothing for ever and look like a quiet news
 * day. `NewsTopics.test.ts` pins that containment, which is the only thing that
 * catches a typo in a topic name.
 */
export const NEWS_TOPICS = [
  'blockchain',
  'earnings',
  'ipo',
  'mergers_and_acquisitions',
  'financial_markets',
  'economy_fiscal',
  'economy_monetary',
  'economy_macro',
  'energy_transportation',
  'finance',
  'life_sciences',
  'manufacturing',
  'real_estate',
  'retail_wholesale',
  'technology',
] as const;

export type NewsTopic = (typeof NEWS_TOPICS)[number];

/**
 * Categories are matched on the topics an article declares.
 *
 * One honest gap remains, reported rather than papered over: there is no
 * commodities topic, so Gold leans on the macro topics that actually move it —
 * real rates, monetary policy and fiscal policy — and reads the metal only
 * indirectly. Fixed Deposit, Pension and Cash are absent entirely: their value
 * is contractual, and news does not move it.
 *
 * `economy_monetary` is the topic that matters most to the two rate-sensitive
 * rows here. It is a real published topic ("interest rates, inflation") and its
 * absence was an artefact of an earlier rule that admitted only topics seen in a
 * response — a rule that existed because an unrecognised topic could fail the
 * one request there was. No topic is sent now, so the published list governs.
 */
export const CATEGORY_TOPICS: Readonly<Record<string, readonly NewsTopic[]>> = {
  [AssetCategory.INDEX_FUND]: ['financial_markets', 'economy_macro', 'earnings'],
  [AssetCategory.MUTUAL_FUNDS]: ['financial_markets', 'economy_macro', 'earnings'],
  [AssetCategory.STOCK]: ['financial_markets', 'earnings', 'economy_macro', 'technology'],
  [AssetCategory.DEBT]: ['economy_monetary', 'economy_macro', 'economy_fiscal', 'finance'],
  [AssetCategory.GOLD]: ['economy_monetary', 'economy_macro', 'economy_fiscal'],
  [AssetCategory.REAL_ESTATE]: ['real_estate', 'economy_macro', 'economy_monetary'],
  [AssetCategory.CRYPTOCURRENCY]: ['blockchain', 'financial_markets', 'technology'],
};

export function topicsForCategory(category: string): readonly NewsTopic[] {
  return CATEGORY_TOPICS[category] ?? [];
}

export function categoriesWithNews(): string[] {
  return Object.keys(CATEGORY_TOPICS);
}
