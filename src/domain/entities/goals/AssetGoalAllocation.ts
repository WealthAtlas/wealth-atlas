/**
 * AssetGoalAllocation entity representing the percentage allocation of an asset to a specific goal
 *
 * This entity tracks static percentage-based allocations where users manually define
 * what percentage of an asset's value is allocated toward achieving a specific goal.
 */
export interface IAssetGoalAllocation {
  id?: number;
  assetId: number;
  goalId: number;
  allocationPercentage: number; // as decimal (0.01 to 1.00 for 1% to 100%)
  createdAt: Date;
}

export class AssetGoalAllocation implements IAssetGoalAllocation {
  id?: number;
  assetId: number;
  goalId: number;
  allocationPercentage: number;
  createdAt: Date;

  constructor(
    assetId: number,
    goalId: number,
    allocationPercentage: number,
    createdAt: Date = new Date(),
    id?: number
  ) {
    this.validateInputs(assetId, goalId, allocationPercentage);

    this.id = id;
    this.assetId = assetId;
    this.goalId = goalId;
    this.allocationPercentage = allocationPercentage;
    this.createdAt = createdAt;
  }

  /**
   * Get allocation percentage as a display-friendly percentage (0.4 -> 40%)
   */
  getAllocationPercentageDisplay(): number {
    return this.allocationPercentage * 100;
  }

  /**
   * Calculate the allocated amount based on asset's current value
   */
  getAllocatedAmount(assetCurrentValue: number): number {
    return assetCurrentValue * this.allocationPercentage;
  }

  /**
   * Check if this allocation uses the full asset (100% allocation)
   */
  isFullAllocation(): boolean {
    return this.allocationPercentage === 1.0;
  }

  /**
   * Create allocation from percentage input (e.g., 40 -> 0.4)
   */
  static fromPercentageInput(
    assetId: number,
    goalId: number,
    percentageInput: number,
    createdAt: Date = new Date(),
    id?: number
  ): AssetGoalAllocation {
    const allocationPercentage = percentageInput / 100;
    return new AssetGoalAllocation(assetId, goalId, allocationPercentage, createdAt, id);
  }

  private validateInputs(assetId: number, goalId: number, allocationPercentage: number): void {
    if (!assetId || assetId <= 0) {
      throw new Error('Asset ID must be a positive number');
    }

    if (!goalId || goalId <= 0) {
      throw new Error('Goal ID must be a positive number');
    }

    if (allocationPercentage <= 0 || allocationPercentage > 1) {
      throw new Error('Allocation percentage must be between 0.01 and 1.00 (1% to 100%)');
    }
  }
}
