import { IAssetGoalAllocation } from '../../../domain/entities/goals/AssetGoalAllocation';
import { database } from '../../database';

export class AssetGoalAllocationRepository {
  async create(allocation: IAssetGoalAllocation): Promise<IAssetGoalAllocation> {
    const id = await database.assetGoalAllocations.add(allocation);
    return { ...allocation, id };
  }

  async update(allocation: IAssetGoalAllocation): Promise<IAssetGoalAllocation> {
    await database.assetGoalAllocations.update(allocation.id, allocation);
    return allocation;
  }

  async getById(id: number): Promise<IAssetGoalAllocation> {
    return (await database.assetGoalAllocations.get(id)) ?? Promise.reject('Allocation not found');
  }

  async getByGoalId(goalId: number): Promise<IAssetGoalAllocation[]> {
    return await database.assetGoalAllocations.where('goalId').equals(goalId).toArray();
  }

  async getAll(): Promise<IAssetGoalAllocation[]> {
    return await database.assetGoalAllocations.toArray();
  }

  async delete(id: number): Promise<void> {
    await database.assetGoalAllocations.delete(id);
  }

  async deleteByGoal(goalId: number): Promise<void> {
    const allocations = await database.assetGoalAllocations
      .where('goalId')
      .equals(goalId)
      .toArray();
    await Promise.all(
      allocations.map(allocation => database.assetGoalAllocations.delete(allocation.id))
    );
  }
}
