import { describe, expect, it } from 'vitest';
import { Asset, IAsset } from '../entities/assets/Asset';
import { Investment, InvestmentType } from '../entities/assets/Investment';
import { ValueModel } from '../entities/assets/ValueModel';
import { Allocation } from '../entities/goals/Allocation';
import { Goal } from '../entities/goals/Goal';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { computeGoalPortfolioTotals, computeGoalProgress } from './GoalService';

const USD_RATE = 88;

function converter(rates: Partial<Record<Currency, number>> = {}): CurrencyConverter {
  return new CurrencyConverter(
    Currency.INR,
    new Map(Object.entries(rates) as [Currency, number][])
  );
}

/**
 * A maturity-based asset is used throughout: its value is pinned to a stated
 * maturity amount and date, so `getValueOn` is stable rather than dependent on
 * a market rate or on how long the test suite has been running.
 */
const ASSET: IAsset = {
  id: 1,
  name: 'Test Asset',
  description: '',
  category: 'Debt',
  currency: Currency.INR,
  valueModel: ValueModel.MATURITY_BASED,
  interestRate: undefined,
  maturityDate: new Date('2030-01-01'),
  maturityAmount: 200000,
  manualValue: undefined,
  manualValueUpdatedAt: undefined,
  script: undefined,
  scriptValue: undefined,
  scriptValueUpdatedAt: undefined,
};

function asset(overrides: Partial<IAsset> = {}): Asset {
  return new Asset({
    ...ASSET,
    ...overrides,
    investments: [
      new Investment({
        id: undefined,
        assetId: 1,
        type: InvestmentType.BUY,
        quantity: 1,
        totalAmount: 100000,
        date: new Date('2020-01-01'),
      }),
    ],
    sips: [],
  });
}

function goal(
  overrides: {
    targetAmount?: number;
    currency?: Currency;
    inflationRate?: number;
    maturityDate?: Date;
    allocations?: { asset: Asset; percentage: number }[];
  } = {}
): Goal {
  const {
    targetAmount = 100000,
    currency = Currency.INR,
    inflationRate = 0,
    maturityDate = new Date('2030-01-01'),
    allocations = [{ asset: asset(), percentage: 100 }],
  } = overrides;

  return new Goal({
    id: 1,
    name: 'Test Goal',
    targetAmount,
    maturityDate,
    inflationRate,
    currency,
    createdAt: new Date('2020-01-01'),
    assetAllocations: allocations.map(
      (allocation, index) =>
        new Allocation({
          id: index + 1,
          assetId: allocation.asset.id!,
          goalId: 1,
          allocationPercentage: allocation.percentage,
          asset: allocation.asset,
        })
    ),
  });
}

describe('computeGoalProgress', () => {
  it('measures the projected value at maturity against the target', () => {
    const progress = computeGoalProgress(
      goal({ targetAmount: 200000, maturityDate: new Date('2030-01-01') }),
      converter()
    );

    // The asset matures at 200,000 on the same date, fully allocated. Maturity
    // value is reached by discounting at a solved IRR, so it lands within the
    // solver's tolerance rather than exactly on the stated amount.
    expect(progress.projectedValue).toBeCloseTo(200000, -2);
    expect(progress.targetAmount).toBe(200000);
    expect(progress.progressPercentage).toBeCloseTo(100, 1);
    expect(progress.shortfall).toBe(0);
  });

  it('counts only the allocated percentage of an asset', () => {
    const progress = computeGoalProgress(
      goal({ targetAmount: 200000, allocations: [{ asset: asset(), percentage: 25 }] }),
      converter()
    );

    expect(progress.projectedValue).toBeCloseTo(50000, -2);
    expect(progress.progressPercentage).toBeCloseTo(25, 1);
    expect(progress.shortfall).toBeCloseTo(150000, -2);
  });

  it('inflates the target and reports the shortfall against the inflated figure', () => {
    const progress = computeGoalProgress(
      goal({ targetAmount: 100000, inflationRate: 0.06 }),
      converter()
    );

    expect(progress.targetAmount).toBe(100000);
    expect(progress.inflationAdjustedTarget).toBeGreaterThan(100000);
    // Progress is measured against the inflated target, not the nominal one.
    expect(progress.progressPercentage).toBeLessThan(200);
    expect(progress.shortfall).toBe(
      Math.max(0, progress.inflationAdjustedTarget - progress.projectedValue)
    );
  });

  it('reports a value today alongside the projected one', () => {
    const progress = computeGoalProgress(goal(), converter());

    // The asset accrues toward maturity, so today's value is the lower of the two.
    expect(progress.currentValue).toBeGreaterThan(0);
    expect(progress.currentValue).toBeLessThan(progress.projectedValue);
  });

  it('converts a target authored in another currency', () => {
    const progress = computeGoalProgress(
      goal({ targetAmount: 1000, currency: Currency.USD }),
      converter({ [Currency.USD]: USD_RATE })
    );

    expect(progress.targetAmount).toBe(1000 * USD_RATE);
    expect(progress.currency).toBe(Currency.INR);
    expect(progress.unratedCurrencies).toEqual([]);
  });

  it('names an unrated currency rather than reporting a silently wrong target', () => {
    const progress = computeGoalProgress(
      goal({ targetAmount: 1000, currency: Currency.USD }),
      converter()
    );

    expect(progress.targetAmount).toBe(0);
    expect(progress.unratedCurrencies).toEqual([Currency.USD]);
  });

  it('reports zero progress for a goal with no allocations', () => {
    const progress = computeGoalProgress(goal({ allocations: [] }), converter());

    expect(progress.projectedValue).toBe(0);
    expect(progress.currentValue).toBe(0);
    expect(progress.progressPercentage).toBe(0);
    expect(progress.shortfall).toBe(progress.inflationAdjustedTarget);
  });
});

describe('computeGoalPortfolioTotals', () => {
  it('returns zeroed totals for no goals', () => {
    const totals = computeGoalPortfolioTotals([], converter());

    expect(totals.totalTargetAmount).toBe(0);
    expect(totals.totalCurrentValue).toBe(0);
    expect(totals.averageYearsToMaturity).toBe(0);
  });

  it('sums targets across goals', () => {
    const totals = computeGoalPortfolioTotals(
      [goal({ targetAmount: 100000 }), goal({ targetAmount: 250000 })],
      converter()
    );

    expect(totals.totalTargetAmount).toBe(350000);
    expect(totals.currency).toBe(Currency.INR);
  });

  it('totals what the allocations are worth today, not at maturity', () => {
    const single = goal();
    const totals = computeGoalPortfolioTotals([single], converter());

    expect(totals.totalCurrentValue).toBeCloseTo(
      computeGoalProgress(single, converter()).currentValue,
      2
    );
  });

  it('averages years to maturity across goals', () => {
    const totals = computeGoalPortfolioTotals(
      [
        goal({ maturityDate: new Date('2030-01-01') }),
        goal({ maturityDate: new Date('2028-01-01') }),
      ],
      converter()
    );

    expect(totals.averageYearsToMaturity).toBeGreaterThan(0);
  });

  it('collects unrated currencies from goals and their allocated assets', () => {
    const totals = computeGoalPortfolioTotals(
      [goal({ allocations: [{ asset: asset({ currency: Currency.USD }), percentage: 100 }] })],
      converter()
    );

    expect(totals.unratedCurrencies).toEqual([Currency.USD]);
  });
});
