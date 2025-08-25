import { IGoal } from '../../../domain/entities/goals/Goal';
import { database } from '../../database';

export class GoalRepository {
  async create(goal: IGoal): Promise<IGoal> {
    const id = await database.goals.add(goal);
    return { ...goal, id };
  }

  async update(goal: IGoal): Promise<IGoal> {
    await database.goals.update(goal.id, goal);
    return goal;
  }

  async getById(id: string): Promise<IGoal> {
    return (await database.goals.get(id)) ?? Promise.reject('Goal not found');
  }

  async getAll(): Promise<IGoal[]> {
    return await database.goals.toArray();
  }

  async delete(id: string): Promise<void> {
    await database.goals.delete(id);
  }
}
