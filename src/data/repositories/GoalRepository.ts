import { Goal, IGoal } from '@/domain/entities/goals/Goal';
import { database } from '../database';

export class GoalRepository {
  private db = database;

  /**
   * Convert database record to domain entity
   */
  private toDomain(record: IGoal): Goal {
    return new Goal(
      record.name,
      record.targetAmount,
      record.maturityDate,
      record.inflationRate,
      record.currency,
      record.createdAt,
      record.id
    );
  }

  /**
   * Convert domain entity to database record
   */
  private toRecord(goal: Goal): Omit<IGoal, 'id'> {
    return {
      name: goal.name,
      targetAmount: goal.targetAmount,
      maturityDate: goal.maturityDate,
      inflationRate: goal.inflationRate,
      currency: goal.currency,
      createdAt: goal.createdAt,
    };
  }

  /**
   * Get all goals
   */
  async findAll(): Promise<Goal[]> {
    const records = await this.db.goals.toArray();
    return records.map(record => this.toDomain(record));
  }

  /**
   * Find goal by ID
   */
  async findById(id: number): Promise<Goal | null> {
    const record = await this.db.goals.get(id);
    return record ? this.toDomain(record) : null;
  }

  /**
   * Save goal (create or update)
   */
  async save(goal: Goal): Promise<Goal> {
    const record = this.toRecord(goal);

    if (goal.id) {
      // Update existing goal
      await this.db.goals.update(goal.id, record);
      return goal;
    } else {
      // Create new goal
      const id = await this.db.goals.add(record);
      return new Goal(
        goal.name,
        goal.targetAmount,
        goal.maturityDate,
        goal.inflationRate,
        goal.currency,
        goal.createdAt,
        id as number
      );
    }
  }

  /**
   * Delete goal by ID
   */
  async delete(id: number): Promise<void> {
    await this.db.goals.delete(id);
  }

  /**
   * Find goals that will mature within specified number of days
   */
  async findMaturingSoon(daysAhead: number = 30): Promise<Goal[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + daysAhead);

    const records = await this.db.goals.where('maturityDate').belowOrEqual(cutoffDate).toArray();

    return records.map(record => this.toDomain(record));
  }

  /**
   * Find active goals (not yet matured)
   */
  async findActive(): Promise<Goal[]> {
    const currentDate = new Date();

    const records = await this.db.goals.where('maturityDate').above(currentDate).toArray();

    return records.map(record => this.toDomain(record));
  }

  /**
   * Find matured goals
   */
  async findMatured(): Promise<Goal[]> {
    const currentDate = new Date();

    const records = await this.db.goals.where('maturityDate').belowOrEqual(currentDate).toArray();

    return records.map(record => this.toDomain(record));
  }
}
