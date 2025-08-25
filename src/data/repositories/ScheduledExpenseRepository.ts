import { IScheduledExpense } from '../../domain/entities/expenses/ScheduledExpense';
import { database } from '../database';

export class ScheduledExpenseRepository {
  public async create(scheduledExpense: IScheduledExpense): Promise<IScheduledExpense> {
    const id = await database.scheduledExpenses.add(scheduledExpense);
    return { ...scheduledExpense, id };
  }

  public async getById(id: number): Promise<IScheduledExpense> {
    return (
      (await database.scheduledExpenses.get(id)) ?? Promise.reject('ScheduledExpense not found')
    );
  }

  public async getAll(): Promise<IScheduledExpense[]> {
    return await database.scheduledExpenses.toArray();
  }

  public async update(scheduledExpense: IScheduledExpense): Promise<IScheduledExpense> {
    await database.scheduledExpenses.update(scheduledExpense.id, scheduledExpense);
    return scheduledExpense;
  }

  public async delete(id: number): Promise<void> {
    return await database.scheduledExpenses.delete(id);
  }
}
