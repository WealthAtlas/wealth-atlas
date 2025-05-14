import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { GoalEntity } from './goal.entity';
import { GoalDTO, GoalInput } from './goal.graphql';

@Injectable()
export class GoalService {

  constructor(
    @InjectModel(GoalEntity.name) private goalModel: Model<GoalEntity>
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
}