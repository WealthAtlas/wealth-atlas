import { IAllocation } from '../../../domain/entities/goals/Allocation';
import { db } from '../../database';

export class AllocationRepository {
  async create(allocation: IAllocation): Promise<IAllocation> {
    const id = await db.allocations.add(allocation);
    return { ...allocation, id };
  }

  async update(allocation: IAllocation): Promise<IAllocation> {
    await db.allocations.update(allocation.id, allocation);
    return allocation;
  }

  async getById(id: number): Promise<IAllocation> {
    return (await db.allocations.get(id))!;
  }

  async getByGoalId(goalId: number): Promise<IAllocation[]> {
    return await db.allocations.where('goalId').equals(goalId).toArray();
  }

  async getAll(): Promise<IAllocation[]> {
    return await db.allocations.toArray();
  }

  async delete(id: number): Promise<void> {
    await db.allocations.delete(id);
  }

  async deleteByGoal(goalId: number): Promise<void> {
    const allocations = await db.allocations.where('goalId').equals(goalId).toArray();
    await Promise.all(allocations.map(allocation => db.allocations.delete(allocation.id)));
  }
}
