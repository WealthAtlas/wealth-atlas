import { AssetCategory } from '@/domain/entities/assets/AssetCategory';
import { Currency } from '@/domain/entities/shared/Currency';

/**
 * Which traded series stands in for each asset category.
 *
 * A closed table, on purpose. The alternative — matching each of the user's
 * assets to an instrument by name — has no reliable input: nothing in `IAsset`
 * records a scheme code or ticker, so the match would be a guess, and a guess
 * here silently attaches a real price history to the wrong holding. A category
 * benchmark makes the weaker claim that happens to be true, and it is the claim
 * the buy-the-dip question actually needs: not "your fund is down 7%" but
 * "Indian large-cap equity is 7% off its high".
 *
 * Categories deliberately absent, because no market series describes them:
 * Fixed Deposit and Pension (contractual, not marked to market), Real Estate
 * (no free per-property series exists), Cash, Other. The port reports these as
 * unavailable rather than substituting something close-enough — a benchmark
 * that does not describe the holding is worse than none, because it reads as
 * fact.
 *
 * Every code here was verified against the live API before being added. Nifty
 * 50 stands in for equity generally: an index fund's NAV tracks the index it
 * follows, so it is a free, keyless series for the index itself.
 */

export type BenchmarkKind = 'mfapi' | 'coingecko';

export interface Benchmark {
  kind: BenchmarkKind;
  /** Scheme code for mfapi, coin id for CoinGecko. */
  id: string;
  /** What the reply should name as the thing measured. */
  label: string;
  currency: Currency;
}

export const CATEGORY_BENCHMARKS: Readonly<Record<string, Benchmark>> = {
  [AssetCategory.INDEX_FUND]: {
    kind: 'mfapi',
    id: '120716',
    label: 'Nifty 50 (UTI Nifty 50 Index Fund NAV)',
    currency: Currency.INR,
  },
  [AssetCategory.MUTUAL_FUNDS]: {
    kind: 'mfapi',
    id: '120716',
    label: 'Nifty 50, as a broad Indian equity proxy',
    currency: Currency.INR,
  },
  [AssetCategory.STOCK]: {
    kind: 'mfapi',
    id: '120716',
    label: 'Nifty 50, as a broad Indian equity proxy',
    currency: Currency.INR,
  },
  [AssetCategory.DEBT]: {
    kind: 'mfapi',
    id: '119533',
    label: 'Indian corporate bond (Aditya Birla Corporate Bond Fund NAV)',
    currency: Currency.INR,
  },
  [AssetCategory.GOLD]: {
    kind: 'mfapi',
    id: '119132',
    label: 'Gold in INR (HDFC Gold ETF Fund of Fund NAV)',
    currency: Currency.INR,
  },
  [AssetCategory.CRYPTOCURRENCY]: {
    kind: 'coingecko',
    id: 'bitcoin',
    label: 'Bitcoin in INR, as a crypto proxy',
    currency: Currency.INR,
  },
};

export function benchmarkFor(category: string): Benchmark | undefined {
  return CATEGORY_BENCHMARKS[category];
}

export function benchmarkedCategories(): string[] {
  return Object.keys(CATEGORY_BENCHMARKS);
}
