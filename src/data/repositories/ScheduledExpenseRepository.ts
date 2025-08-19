import { IScheduledExpense, ScheduledExpense } from '@/domain/entities/expenses/ScheduledExpense';
import { database } from '../database';

export class ScheduledExpenseRepository {
  private toDomain(record: IScheduledExpense): ScheduledExpense {
    return new ScheduledExpense(
      record.id,
      record.name,
      record.amount,
      record.currency,
      record.category,
      record.isEssential,
      record.frequency,
      new Date(record.startDate),
      record.endDate ? new Date(record.endDate) : undefined,
      record.lastGeneratedDate ? new Date(record.lastGeneratedDate) : undefined,
      record.description
    );
  }

  private toRecord(scheduledExpense: ScheduledExpense): Omit<IScheduledExpense, 'id'> {
    return {
      name: scheduledExpense.name,
      amount: scheduledExpense.amount,
      currency: scheduledExpense.currency,
      category: scheduledExpense.category,
      isEssential: scheduledExpense.isEssential,
      frequency: scheduledExpense.frequency,
      startDate: scheduledExpense.startDate,
      endDate: scheduledExpense.endDate,
      lastGeneratedDate: scheduledExpense.lastGeneratedDate,
      description: scheduledExpense.description,
    };
  }

  async findAll(): Promise<ScheduledExpense[]> {
    const records = await database.scheduledExpenses.orderBy('name').toArray();
    return records.map((record: IScheduledExpense) => this.toDomain(record));
  }

  async findById(id: number): Promise<ScheduledExpense | null> {
    const record = await database.scheduledExpenses.get(id);
    return record ? this.toDomain(record) : null;
  }

  async findActive(): Promise<ScheduledExpense[]> {
    const allSchedules = await this.findAll();
    return allSchedules.filter(schedule => schedule.isActive());
  }

  async save(scheduledExpense: ScheduledExpense): Promise<ScheduledExpense> {
    if (scheduledExpense.id) {
      await database.scheduledExpenses.update(scheduledExpense.id, this.toRecord(scheduledExpense));
      return scheduledExpense;
    } else {
      const id = await database.scheduledExpenses.add(this.toRecord(scheduledExpense));
      return new ScheduledExpense(
        id,
        scheduledExpense.name,
        scheduledExpense.amount,
        scheduledExpense.currency,
        scheduledExpense.category,
        scheduledExpense.isEssential,
        scheduledExpense.frequency,
        scheduledExpense.startDate,
        scheduledExpense.endDate,
        scheduledExpense.lastGeneratedDate,
        scheduledExpense.description
      );
    }
  }

  async delete(id: number): Promise<void> {
    await database.scheduledExpenses.delete(id);
  }

  async deleteAll(): Promise<void> {
    await database.scheduledExpenses.clear();
  }

  async updateLastGeneratedDate(id: number, date: Date): Promise<void> {
    await database.scheduledExpenses.update(id, { lastGeneratedDate: date });
  }
}
