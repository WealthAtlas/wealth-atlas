import { IAllocation } from '../../../domain/entities/goals/Allocation';
import { database } from '../../database';

export class AllocationRepository {
  async create(allocation: IAllocation): Promise<IAllocation> {
    const id = await database.allocations.add(allocation);
    return { ...allocation, id };
  }

  async update(allocation: IAllocation): Promise<IAllocation> {
    await database.allocations.update(allocation.id, allocation);
    return allocation;
  }

  async getById(id: number): Promise<IAllocation> {
    return (await database.allocations.get(id))!;
  }

  async getByGoalId(goalId: number): Promise<IAllocation[]> {
    return await database.allocations.where('goalId').equals(goalId).toArray();
  }

  async getAll(): Promise<IAllocation[]> {
    return await database.allocations.toArray();
  }

  async delete(id: number): Promise<void> {
    await database.allocations.delete(id);
  }

  async deleteByGoal(goalId: number): Promise<void> {
    const allocations = await database.allocations.where('goalId').equals(goalId).toArray();
    await Promise.all(allocations.map(allocation => database.allocations.delete(allocation.id)));
  }
}
