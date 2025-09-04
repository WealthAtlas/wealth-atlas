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

  public async createGoal(goal: IGoal): Promise<Goal> {
    return await this.goalRepository
      .create(goal)
      .then(async createdGoal => this.toGoal(createdGoal));
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

  public async updateGoal(goalId: number, goalData: IGoal): Promise<Goal> {
    const updatedGoal: IGoal = {
      ...goalData,
      id: goalId,
      createdAt: goalData.createdAt || new Date(),
    };
    return await this.goalRepository.create(updatedGoal).then(async g => this.toGoal(g));
  }
}
