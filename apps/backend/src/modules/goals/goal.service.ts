import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssetService } from '../asset/asset.service';
import { GoalEntity } from './goal.entity';
import { AllocatedAssetDTO, GoalDTO, GoalInput } from './goal.graphql';
import { GoalAssetAllocationEntity } from './goal_asset_allocation.entity';

@Injectable()
export class GoalService {

  constructor(
    @InjectModel(GoalEntity.name) private goalModel: Model<GoalEntity>,
    @InjectModel(GoalAssetAllocationEntity.name) private goalAssetAllocationModel: Model<GoalAssetAllocationEntity>,
    private readonly assetService: AssetService,
  ) {
  }

  async createGoal(userId: string, input: GoalInput): Promise<GoalDTO> {
    const goal = new this.goalModel({
      userId: userId,
      name: input.name,
      targetAmount: input.targetAmount,
      inflationRate: input.inflationRate,
      targetDate: input.targetDate,
    });

    return goal.save().then((savedGoal) => {
      return {
        id: savedGoal._id,
        name: savedGoal.name,
        targetAmount: savedGoal.targetAmount,
        inflationRate: savedGoal.inflationRate,
        targetDate: savedGoal.targetDate
      };
    });
  }

  async getGoals(userId: string): Promise<GoalDTO[]> {
    return this.goalModel.find({ userId }).exec().then((goals) => {
      return goals.map((goal) => {
        return {
          id: goal._id,
          name: goal.name,
          targetAmount: goal.targetAmount,
          inflationRate: goal.inflationRate,
          targetDate: goal.targetDate
        };
      });
    });
  }

  async getAllocatedAssets(goalId: number): Promise<AllocatedAssetDTO[]> {
    return this.goalAssetAllocationModel.find({ goalId }).exec().then((allocations) => {
      return Promise.all(allocations.map(async (allocation) => {
        return {
          asset: await this.assetService.getAsset(allocation.assetId),
          percentage: allocation.percentageOfAsset
        };
      }));
    });
  }
}