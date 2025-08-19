import { Expense, IExpense } from '@/domain/entities/expenses/Expense';
import { database } from '../database';

export class ExpenseRepository {
  private toDomain(record: IExpense): Expense {
    return new Expense({
      id: record.id,
      amount: record.amount,
      currency: record.currency,
      date: new Date(record.date),
      category: record.category,
      isEssential: record.isEssential,
      description: record.description,
    });
  }

  private toRecord(expense: Expense): Omit<IExpense, 'id'> {
    return {
      amount: expense.amount,
      currency: expense.currency,
      date: expense.date,
      category: expense.category,
      isEssential: expense.isEssential,
      description: expense.description,
    };
  }

  async findAll(): Promise<Expense[]> {
    const records = await database.expenses.orderBy('date').reverse().toArray();
    return records.map((record: IExpense) => this.toDomain(record));
  }

  async findById(id: number): Promise<Expense | null> {
    const record = await database.expenses.get(id);
    return record ? this.toDomain(record) : null;
  }

  async findByDateRange(startDate: Date, endDate: Date): Promise<Expense[]> {
    const records = await database.expenses
      .where('date')
      .between(startDate, endDate, true, true)
      .toArray();
    return records.map((record: IExpense) => this.toDomain(record));
  }

  async findByMonth(year: number, month: number): Promise<Expense[]> {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999);
    return this.findByDateRange(startDate, endDate);
  }

  async save(expense: Expense): Promise<Expense> {
    if (expense.id) {
      await database.expenses.update(expense.id, this.toRecord(expense));
      return expense;
    } else {
      const id = await database.expenses.add(this.toRecord(expense));
      return new Expense({ ...expense, id });
    }
  }

  async delete(id: number): Promise<void> {
    await database.expenses.delete(id);
  }

  async deleteAll(): Promise<void> {
    await database.expenses.clear();
  }
}
