import { IGoal } from '../../../domain/entities/goals/Goal';
import { db } from '../../database';

export class GoalRepository {
  async create(goal: IGoal): Promise<IGoal> {
    const id = await db.goals.add(goal);
    return { ...goal, id };
  }

  async update(goal: IGoal): Promise<IGoal> {
    await db.goals.update(goal.id, goal);
    return goal;
  }

  async getById(id: string): Promise<IGoal> {
    return (await db.goals.get(id))!;
  }

  async getAll(): Promise<IGoal[]> {
    return await db.goals.toArray();
  }

  async delete(id: number): Promise<void> {
    await db.goals.delete(id);
  }

  public async save(goal: IGoal): Promise<IGoal> {
    // Placeholder for saving a goal to the database
    return goal;
  }
}
