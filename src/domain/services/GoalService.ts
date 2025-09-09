import { AllocationRepository } from '@/data/repositories/goal/AllocationRepository';
import { GoalRepository } from '@/data/repositories/goal/GoalRepository';
import { Allocation } from '../entities/goals/Allocation';
import { Goal, IGoal } from '../entities/goals/Goal';
import { AssetService } from './AssetService';

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
