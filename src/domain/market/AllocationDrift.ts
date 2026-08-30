import { Asset } from '../entities/assets/Asset';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { ICategoryTarget } from '../entities/shared/Settings';
import { computeAssetCategoryData } from '../services/DashboardService';

/**
 * How far the portfolio has drifted from the allocation the user intended.
 *
 * This is what a decision is measured from, and market news is not. "Equity is
 * cheap because of the war" is a story that argues in whichever direction it is
 * read; "equity is 52% of the portfolio against a 60% target, so it is 8 points
 * light" is a quantity, and it points the same way every time it is computed. A
 * drawdown says whether a gap is a discount or a broken thesis (see
 * `NavSeries`); the gap itself is what sizes the move. The assistant may argue
 * for going past the policy when the tools can actually demonstrate a regime —
 * chat prompt rule 8h — but a tilt is still stated as a distance from the
 * number this function computes, which is why it comes first.
 *
 * `action` names the *direction* of the gap, not the remedy. An overweight
 * category is usually overweight because it rose, and pointing new contributions
 * at the underweight rows closes the gap without the capital gains, exit load or
 * broken lock-in a sale costs — none of which this app records. Prompt rule 8g
 * carries that preference; the UI's Buy/Sell chip is the same direction stated
 * to a user who is looking at the whole table.
 *
 * Targets are passed in rather than read: `AllocationPolicyService` reads
 * `ISettings.targetAllocation` and this stays pure. `Goal.allocations` is
 * emphatically not that policy — it is asset-to-goal earmarking ("40% of this
 * fund is for the house"), a different question from "what share of my portfolio
 * should be equity".
 */

export type DriftAction = 'buy' | 'sell' | 'hold';

export interface DriftRow {
  category: string;
  targetPercent: number;
  actualPercent: number;
  /** Actual minus target, in percentage points. Negative means underweight. */
  driftPercent: number;
  currentValue: number;
  /** Value to move to return to target. Positive to buy, negative to sell. */
  adjustmentAmount: number;
  bandPercent: number;
  /** `hold` whenever the drift is inside the band, whatever its sign. */
  action: DriftAction;
}

export interface AllocationDrift {
  rows: DriftRow[];
  totalValue: number;
  currency: Currency;
  /**
   * Categories held but never given a target. Not an error — it is the honest
   * report that the policy does not cover part of the portfolio, so the drift
   * on everything else is measured against an incomplete plan.
   */
  untargeted: { category: string; actualPercent: number; currentValue: number }[];
  /**
   * Holdings in these currencies counted as ZERO in every figure above,
   * because no rate is configured for them. Carried for the same reason every
   * other aggregate carries it: an understated total otherwise reads as real.
   */
  unratedCurrencies: string[];
}

const DEFAULT_BAND_PERCENT = 5;

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

export function computeAllocationDrift(
  assets: Asset[],
  targets: ICategoryTarget[],
  converter: CurrencyConverter
): AllocationDrift {
  const categories = computeAssetCategoryData(assets, converter);
  const totalValue = categories.reduce((sum, entry) => sum + entry.value, 0);
  const actualByCategory = new Map(categories.map(entry => [entry.id, entry]));

  const rows = targets.map(target => {
    // A targeted category with nothing in it is the case that matters most —
    // "you hold no international equity" — so it must produce a row, not be
    // dropped for having no holdings. `computeAssetCategoryData` filters
    // zero-value categories out, hence the explicit fallback.
    const actual = actualByCategory.get(target.category);
    const currentValue = actual?.value ?? 0;
    const actualPercent = totalValue > 0 ? (currentValue / totalValue) * 100 : 0;
    const driftPercent = actualPercent - target.targetPercent;
    const bandPercent = target.bandPercent ?? DEFAULT_BAND_PERCENT;

    return {
      category: target.category,
      targetPercent: target.targetPercent,
      actualPercent: round(actualPercent),
      driftPercent: round(driftPercent),
      currentValue: round(currentValue),
      adjustmentAmount: round((target.targetPercent / 100) * totalValue - currentValue),
      bandPercent,
      action: Math.abs(driftPercent) <= bandPercent ? 'hold' : driftPercent < 0 ? 'buy' : 'sell',
    } satisfies DriftRow;
  });

  const targeted = new Set(targets.map(target => target.category));

  return {
    // Most out of band first: the largest absolute drift is the decision to
    // make, and a table the user reads top-down should open with it.
    rows: rows.sort((left, right) => Math.abs(right.driftPercent) - Math.abs(left.driftPercent)),
    totalValue: round(totalValue),
    currency: converter.getBaseCurrency(),
    untargeted: categories
      .filter(entry => !targeted.has(entry.id))
      .map(entry => ({
        category: entry.id,
        actualPercent: round(entry.percentage),
        currentValue: round(entry.value),
      })),
    unratedCurrencies: converter.getUnratedCurrencies(assets.map(asset => asset.currency)),
  };
}
