import { Asset } from '../assets/Asset';

/**
 * AssetGoalAllocation entity representing the percentage allocation of an asset to a specific goal
 *
 * This entity tracks static percentage-based allocations where users manually define
 * what percentage of an asset's value is allocated toward achieving a specific goal.
 */
export interface IAllocation {
  id: number | undefined;
  assetId: number;
  goalId: number;
  allocationPercentage: number;
}

export class Allocation implements IAllocation {
  id: number | undefined;
  assetId: number;
  goalId: number;
  allocationPercentage: number;
  asset: Asset;

  constructor({
    id,
    assetId,
    goalId,
    allocationPercentage,
    asset,
  }: IAllocation & { asset: Asset }) {
    this.id = id;
    this.assetId = assetId;
    this.goalId = goalId;
    this.allocationPercentage = allocationPercentage;
    this.asset = asset;
  }
}
