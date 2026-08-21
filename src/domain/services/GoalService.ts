import { AllocationRepository } from '@/data/repositories/goal/AllocationRepository';
import { GoalRepository } from '@/data/repositories/goal/GoalRepository';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { Allocation } from '../entities/goals/Allocation';
import { Goal, IGoal } from '../entities/goals/Goal';
import { AssetService } from './AssetService';

/**
 * Progress for one goal, every figure in the base currency.
 *
 * A goal's target is authored in its own currency while the assets funding it
 * each carry theirs, so both sides convert before they are compared.
 *
 * `projectedValue` and `currentValue` answer different questions and are both
 * in use: the goal card measures the value the allocations are expected to
 * reach *by the maturity date* against an inflation-adjusted target — comparing
 * both sides at the same point in time — while the goals summary totals what
 * the allocations are worth *today*.
 */
export interface GoalProgress {
  /** Allocated asset value on the maturity date. */
  projectedValue: number;
  /** Allocated asset value as of now. */
  currentValue: number;
  targetAmount: number;
  inflationAdjustedTarget: number;
  /** `projectedValue` as a percentage of `inflationAdjustedTarget`. */
  progressPercentage: number;
  shortfall: number;
  yearsToMaturity: number;
  currency: Currency;
  /** Currencies with no rate, whose holdings contributed 0 to the figures above. */
  unratedCurrencies: Currency[];
}

/** Totals across every goal, in the base currency. */
export interface GoalPortfolioTotals {
  totalTargetAmount: number;
  totalInflationAdjustedTarget: number;
  totalCurrentValue: number;
  averageYearsToMaturity: number;
  currency: Currency;
  unratedCurrencies: Currency[];
}

/** Sum of each allocation's share of its asset's value, converted to base. */
function allocatedValue(goal: Goal, converter: CurrencyConverter, on?: Date): number {
  return goal.allocations.reduce((sum, allocation) => {
    const assetValue = (on ? allocation.asset.getValueOn(on) : allocation.asset.getValue()) || 0;
    const share = (assetValue * allocation.allocationPercentage) / 100;
    return sum + converter.toBase(share, allocation.asset.currency);
  }, 0);
}

function currenciesInUse(goals: Goal[]): Currency[] {
  return [
    ...goals.map(goal => goal.currency),
    ...goals.flatMap(goal => goal.allocations.map(allocation => allocation.asset.currency)),
  ];
}

export function computeGoalProgress(goal: Goal, converter: CurrencyConverter): GoalProgress {
  const projectedValue = allocatedValue(goal, converter, goal.maturityDate);
  const targetAmount = converter.toBase(goal.targetAmount, goal.currency);
  const inflationAdjustedTarget = converter.toBase(
    goal.getInflationAdjustedTarget(),
    goal.currency
  );

  return {
    projectedValue,
    currentValue: allocatedValue(goal, converter),
    targetAmount,
    inflationAdjustedTarget,
    progressPercentage:
      inflationAdjustedTarget > 0 ? (projectedValue / inflationAdjustedTarget) * 100 : 0,
    shortfall: Math.max(0, inflationAdjustedTarget - projectedValue),
    yearsToMaturity: goal.getYearsToMaturity(),
    currency: converter.getBaseCurrency(),
    unratedCurrencies: converter.getUnratedCurrencies(currenciesInUse([goal])),
  };
}

export function computeGoalPortfolioTotals(
  goals: Goal[],
  converter: CurrencyConverter
): GoalPortfolioTotals {
  const totalTargetAmount = goals.reduce(
    (sum, goal) => sum + converter.toBase(goal.targetAmount, goal.currency),
    0
  );
  const totalInflationAdjustedTarget = goals.reduce(
    (sum, goal) => sum + converter.toBase(goal.getInflationAdjustedTarget(), goal.currency),
    0
  );
  const totalCurrentValue = goals.reduce((sum, goal) => sum + allocatedValue(goal, converter), 0);

  return {
    totalTargetAmount,
    totalInflationAdjustedTarget,
    totalCurrentValue,
    averageYearsToMaturity:
      goals.length > 0
        ? goals.reduce((sum, goal) => sum + goal.getYearsToMaturity(), 0) / goals.length
        : 0,
    currency: converter.getBaseCurrency(),
    unratedCurrencies: converter.getUnratedCurrencies(currenciesInUse(goals)),
  };
}

export class GoalService {
  private readonly goalRepository: GoalRepository;
  private readonly assetGoalAllocationRepository: AllocationRepository;
  private readonly assetService: AssetService;

  constructor() {
    this.goalRepository = new GoalRepository();
    this.assetGoalAllocationRepository = new AllocationRepository();
    this.assetService = new AssetService();
  }

  public async createGoal(
    goal: IGoal,
    assetAllocations: { assetId: number; percentage: number }[] = []
  ): Promise<Goal> {
    const createdGoal = await this.goalRepository.create(goal);

    // Create asset allocations
    for (const allocation of assetAllocations) {
      await this.assetGoalAllocationRepository.create({
        id: undefined,
        goalId: createdGoal.id!,
        assetId: allocation.assetId,
        allocationPercentage: allocation.percentage,
      });
    }

    return await this.toGoal(createdGoal);
  }

  private async toGoal(data: IGoal): Promise<Goal> {
    const allocationRecords = await this.assetGoalAllocationRepository.getByGoalId(data.id!);
    const allocations = await Promise.all(
      allocationRecords.map(async allocation => {
        const asset = await this.assetService.getAssetById(allocation.assetId);
        return new Allocation({
          ...allocation,
          goalId: data.id!,
          asset,
        });
      })
    );
    return new Goal({
      ...data,
      assetAllocations: allocations,
      createdAt: data.createdAt || new Date(),
    });
  }

  public async deleteGoal(goalId: number): Promise<void> {
    await this.assetGoalAllocationRepository.deleteByGoal(goalId);
    await this.goalRepository.delete(goalId);
  }

  public async getAllGoals(): Promise<Goal[]> {
    const goals = await this.goalRepository.getAll();
    return await Promise.all(goals.map(goal => this.toGoal(goal)));
  }

  public async updateGoal(
    goalId: number,
    goalData: IGoal,
    assetAllocations: { assetId: number; percentage: number }[] = []
  ): Promise<Goal> {
    const updatedGoal: IGoal = {
      ...goalData,
      id: goalId,
      createdAt: goalData.createdAt || new Date(),
    };

    const goal = await this.goalRepository.update(updatedGoal);

    // Delete existing allocations and create new ones
    await this.assetGoalAllocationRepository.deleteByGoal(goalId);
    for (const allocation of assetAllocations) {
      await this.assetGoalAllocationRepository.create({
        id: undefined,
        goalId: goalId,
        assetId: allocation.assetId,
        allocationPercentage: allocation.percentage,
      });
    }

    return await this.toGoal(goal);
  }
}
