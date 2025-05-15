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

  async updateGoal(userId: string, goalId: number, input: GoalInput): Promise<GoalDTO> {
    const goal = await this.goalModel.findOne({ _id: goalId, userId }).exec();
    if (!goal) {
      throw new Error('Goal not found');
    }
    goal.name = input.name;
    goal.targetAmount = input.targetAmount;
    goal.inflationRate = input.inflationRate;
    goal.targetDate = input.targetDate;
    return goal.save().then((updatedGoal) => {
      return {
        id: updatedGoal._id,
        name: updatedGoal.name,
        targetAmount: updatedGoal.targetAmount,
        inflationRate: updatedGoal.inflationRate,
        targetDate: updatedGoal.targetDate
      };
    }
    );
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

  async getAllocatedAssets(userId: string, goalId: number): Promise<AllocatedAssetDTO[]> {
    return this.goalAssetAllocationModel.find({ goalId }).exec().then((allocations) => {
      return Promise.all(allocations.map(async (allocation) => {
        return {
          asset: await this.assetService.getAsset(userId, allocation.assetId),
          percentage: allocation.percentageOfAsset
        };
      }));
    });
  }

  async allocateAsset(id: number, userId: string, assetId: string, percentage: number): Promise<AllocatedAssetDTO> {
    const asset = await this.assetService.getAsset(userId, assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }
    if (percentage < 0 || percentage > 100) {
      throw new Error('Percentage must be between 0 and 100');
    }
    const existingAllocation = await this.goalAssetAllocationModel.findOne({ goalId: id, assetId }).exec();
    if (existingAllocation) {
      existingAllocation.percentageOfAsset = percentage;
      return existingAllocation.save().then((updatedAllocation) => {
        return {
          asset: asset,
          percentage: updatedAllocation.percentageOfAsset
        };
      });
    }

    const allocation = new this.goalAssetAllocationModel({
      goalId: id,
      userId: userId,
      assetId: asset.id,
      percentageOfAsset: percentage
    });
    return allocation.save().then((savedAllocation) => {
      return {
        asset: asset,
        percentage: savedAllocation.percentageOfAsset
      };
    });
  }

  async removeAsset(id: number, assetId: string): Promise<Boolean> {
    return this.goalAssetAllocationModel.findOneAndDelete({ goalId: id, assetId }).exec().then((deletedAllocation) => {
      if (!deletedAllocation) {
        throw new Error('Allocation not found');
      }
      return true;
    });
  }
}