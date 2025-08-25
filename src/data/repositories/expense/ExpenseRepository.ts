import { IExpense } from '../../../domain/entities/expenses/Expense';
import { database } from '../../database';

export class ExpenseRepository {
  public async create(expense: IExpense): Promise<IExpense> {
    const id = await database.expenses.add(expense);
    return { ...expense, id };
  }

  public async getById(id: number): Promise<IExpense> {
    return (await database.expenses.get(id)) ?? Promise.reject('Expense not found');
  }

  public async getAll(): Promise<IExpense[]> {
    return await database.expenses.toArray();
  }

  public async update(expense: IExpense): Promise<IExpense> {
    await database.expenses.update(expense.id, expense);
    return expense;
  }

  public async delete(id: number): Promise<void> {
    return await database.expenses.delete(id);
  }
}
