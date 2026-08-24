import { IExpense } from '../../../domain/entities/expenses/Expense';
import { db } from '../../database';
import { deleteSynced } from '../../sync/merge/Tombstones';

export class ExpenseRepository {
  public async create(expense: IExpense): Promise<IExpense> {
    const id = await db.expenses.add(expense);
    return { ...expense, id };
  }

  public async getById(id: number): Promise<IExpense> {
    return (await db.expenses.get(id))!;
  }

  public async getAll(): Promise<IExpense[]> {
    return await db.expenses.toArray();
  }

  public async update(expense: IExpense): Promise<IExpense> {
    await db.expenses.update(expense.id, expense);
    return expense;
  }

  public async delete(id: number): Promise<void> {
    // Through `deleteSynced`, not `table.delete`: the deletion has to be
    // recorded or the next merge with another device hands the row straight
    // back.
    await deleteSynced('expenses', [id]);
  }
}
