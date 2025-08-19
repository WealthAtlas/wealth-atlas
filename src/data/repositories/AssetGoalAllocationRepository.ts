import {
  AssetGoalAllocation,
  IAssetGoalAllocation,
} from '@/domain/entities/goals/AssetGoalAllocation';
import { database } from '../database';

export class AssetGoalAllocationRepository {
  private db = database;

  /**
   * Convert database record to domain entity
   */
  private toDomain(record: IAssetGoalAllocation): AssetGoalAllocation {
    return new AssetGoalAllocation(
      record.assetId,
      record.goalId,
      record.allocationPercentage,
      record.createdAt,
      record.id
    );
  }

  /**
   * Convert domain entity to database record
   */
  private toRecord(allocation: AssetGoalAllocation): Omit<IAssetGoalAllocation, 'id'> {
    return {
      assetId: allocation.assetId,
      goalId: allocation.goalId,
      allocationPercentage: allocation.allocationPercentage,
      createdAt: allocation.createdAt,
    };
  }

  /**
   * Get all allocations
   */
  async findAll(): Promise<AssetGoalAllocation[]> {
    const records = await this.db.assetGoalAllocations.toArray();
    return records.map(record => this.toDomain(record));
  }

  /**
   * Find allocation by ID
   */
  async findById(id: number): Promise<AssetGoalAllocation | null> {
    const record = await this.db.assetGoalAllocations.get(id);
    return record ? this.toDomain(record) : null;
  }

  /**
   * Find all allocations for a specific asset
   */
  async findByAssetId(assetId: number): Promise<AssetGoalAllocation[]> {
    const records = await this.db.assetGoalAllocations.where('assetId').equals(assetId).toArray();
    return records.map(record => this.toDomain(record));
  }

  /**
   * Find all allocations for a specific goal
   */
  async findByGoalId(goalId: number): Promise<AssetGoalAllocation[]> {
    const records = await this.db.assetGoalAllocations.where('goalId').equals(goalId).toArray();
    return records.map(record => this.toDomain(record));
  }

  /**
   * Find specific allocation for asset-goal combination
   */
  async findByAssetAndGoal(assetId: number, goalId: number): Promise<AssetGoalAllocation | null> {
    const record = await this.db.assetGoalAllocations
      .where('[assetId+goalId]')
      .equals([assetId, goalId])
      .first();
    return record ? this.toDomain(record) : null;
  }

  /**
   * Save allocation (create or update)
   */
  async save(allocation: AssetGoalAllocation): Promise<AssetGoalAllocation> {
    const record = this.toRecord(allocation);

    if (allocation.id) {
      // Update existing allocation
      await this.db.assetGoalAllocations.update(allocation.id, record);
      return allocation;
    } else {
      // Create new allocation
      const id = await this.db.assetGoalAllocations.add(record);
      return new AssetGoalAllocation(
        allocation.assetId,
        allocation.goalId,
        allocation.allocationPercentage,
        allocation.createdAt,
        id as number
      );
    }
  }

  /**
   * Delete allocation by ID
   */
  async delete(id: number): Promise<void> {
    await this.db.assetGoalAllocations.delete(id);
  }

  /**
   * Delete all allocations for a specific goal
   */
  async deleteByGoalId(goalId: number): Promise<void> {
    await this.db.assetGoalAllocations.where('goalId').equals(goalId).delete();
  }

  /**
   * Delete all allocations for a specific asset
   */
  async deleteByAssetId(assetId: number): Promise<void> {
    await this.db.assetGoalAllocations.where('assetId').equals(assetId).delete();
  }

  /**
   * Get total allocation percentage for an asset across all goals
   */
  async getTotalAllocationForAsset(assetId: number): Promise<number> {
    const allocations = await this.findByAssetId(assetId);
    return allocations.reduce((total, allocation) => total + allocation.allocationPercentage, 0);
  }

  /**
   * Check if asset has any allocations
   */
  async hasAllocations(assetId: number): Promise<boolean> {
    const count = await this.db.assetGoalAllocations.where('assetId').equals(assetId).count();
    return count > 0;
  }

  /**
   * Get count of goals that an asset is allocated to
   */
  async getGoalCountForAsset(assetId: number): Promise<number> {
    return await this.db.assetGoalAllocations.where('assetId').equals(assetId).count();
  }
}
