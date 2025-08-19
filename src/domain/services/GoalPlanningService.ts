import { Asset } from '@/domain/entities/assets/Asset';
import { AssetTransaction } from '@/domain/entities/assets/AssetTransaction';
import { AssetGoalAllocation } from '@/domain/entities/goals/AssetGoalAllocation';
import { Goal } from '@/domain/entities/goals/Goal';
import { PortfolioService } from './PortfolioService';

/**
 * Service for goal planning calculations and progress tracking
 */
export class GoalPlanningService {
  private portfolioService = new PortfolioService();

  /**
   * Calculate current progress toward a goal based on allocated assets
   */
  async calculateGoalProgress(
    goal: Goal,
    allocations: AssetGoalAllocation[],
    assets: Asset[],
    allTransactions: AssetTransaction[]
  ): Promise<GoalProgressResult> {
    const inflationAdjustedTarget = goal.getInflationAdjustedTarget();
    let totalCurrentValue = 0;
    let totalProjectedValue = 0;
    const assetProgressDetails: AssetProgressDetail[] = [];

    for (const allocation of allocations) {
      const asset = assets.find(a => a.id === allocation.assetId);
      if (!asset) continue;

      const assetTransactions = allTransactions.filter(t => t.assetId === allocation.assetId);
      const assetSummary = this.portfolioService.getAssetSummary(asset, assetTransactions);

      const allocatedCurrentValue = allocation.getAllocatedAmount(assetSummary.currentValue || 0);
      const assetGrowthRate =
        assetSummary.growthRate !== undefined ? assetSummary.growthRate : null;
      const projectedValue = this.calculateProjectedValue(
        allocatedCurrentValue,
        assetGrowthRate,
        goal.getYearsToMaturity()
      );

      totalCurrentValue += allocatedCurrentValue;
      totalProjectedValue += projectedValue;

      assetProgressDetails.push({
        assetId: allocation.assetId,
        assetName: asset.name,
        allocationPercentage: allocation.getAllocationPercentageDisplay(),
        currentValue: allocatedCurrentValue,
        projectedValue: projectedValue,
        assetIRR: assetGrowthRate,
      });
    }

    const achievementPercentage =
      inflationAdjustedTarget > 0 ? (totalProjectedValue / inflationAdjustedTarget) * 100 : 0;

    const shortfall = Math.max(0, inflationAdjustedTarget - totalProjectedValue);
    const surplus = Math.max(0, totalProjectedValue - inflationAdjustedTarget);

    return {
      goal,
      inflationAdjustedTarget,
      totalCurrentValue,
      totalProjectedValue,
      achievementPercentage,
      shortfall,
      surplus,
      progressStatus: this.getProgressStatus(achievementPercentage),
      assetDetails: assetProgressDetails,
    };
  }

  /**
   * Calculate projected value of current investment based on IRR and time
   */
  private calculateProjectedValue(currentValue: number, irr: number | null, years: number): number {
    if (!irr || years <= 0) {
      return currentValue;
    }

    return currentValue * Math.pow(1 + irr, years);
  }

  /**
   * Determine progress status based on achievement percentage
   */
  private getProgressStatus(achievementPercentage: number): ProgressStatus {
    if (achievementPercentage >= 100) {
      return 'ON_TRACK'; // Green
    } else if (achievementPercentage >= 75) {
      return 'AT_RISK'; // Yellow
    } else {
      return 'UNLIKELY'; // Red
    }
  }

  /**
   * Calculate required monthly investment to meet goal shortfall
   */
  calculateRequiredMonthlyInvestment(
    shortfall: number,
    years: number,
    expectedReturn: number = 0.12 // Default 12% annual return
  ): number {
    if (shortfall <= 0 || years <= 0) {
      return 0;
    }

    const monthlyRate = expectedReturn / 12;
    const months = years * 12;

    // Future Value of Annuity formula: FV = PMT * [((1 + r)^n - 1) / r]
    // Solving for PMT: PMT = FV / [((1 + r)^n - 1) / r]
    const futureValueFactor = (Math.pow(1 + monthlyRate, months) - 1) / monthlyRate;

    return shortfall / futureValueFactor;
  }

  /**
   * Get summary statistics for all goals
   */
  async getGoalsSummary(goals: Goal[]): Promise<GoalsSummary> {
    const activeGoals = goals.filter(g => !g.isMatured());
    const maturedGoals = goals.filter(g => g.isMatured());

    const totalTargetValue = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
    const totalInflationAdjustedValue = goals.reduce(
      (sum, goal) => sum + goal.getInflationAdjustedTarget(),
      0
    );

    return {
      totalGoals: goals.length,
      activeGoals: activeGoals.length,
      maturedGoals: maturedGoals.length,
      totalTargetValue,
      totalInflationAdjustedValue,
      averageInflationRate: this.calculateAverageInflationRate(goals),
      goalsByStatus: this.groupGoalsByMaturity(goals),
    };
  }

  private calculateAverageInflationRate(goals: Goal[]): number {
    if (goals.length === 0) return 0;

    const totalInflationRate = goals.reduce((sum, goal) => sum + goal.inflationRate, 0);
    return totalInflationRate / goals.length;
  }

  private groupGoalsByMaturity(goals: Goal[]): { active: Goal[]; matured: Goal[] } {
    return {
      active: goals.filter(g => !g.isMatured()),
      matured: goals.filter(g => g.isMatured()),
    };
  }
}

// Type definitions for service results
export interface GoalProgressResult {
  goal: Goal;
  inflationAdjustedTarget: number;
  totalCurrentValue: number;
  totalProjectedValue: number;
  achievementPercentage: number;
  shortfall: number;
  surplus: number;
  progressStatus: ProgressStatus;
  assetDetails: AssetProgressDetail[];
}

export interface AssetProgressDetail {
  assetId: number;
  assetName: string;
  allocationPercentage: number;
  currentValue: number;
  projectedValue: number;
  assetIRR: number | null;
}

export interface GoalsSummary {
  totalGoals: number;
  activeGoals: number;
  maturedGoals: number;
  totalTargetValue: number;
  totalInflationAdjustedValue: number;
  averageInflationRate: number;
  goalsByStatus: { active: Goal[]; matured: Goal[] };
}

export type ProgressStatus = 'ON_TRACK' | 'AT_RISK' | 'UNLIKELY';
