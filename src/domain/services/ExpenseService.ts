import { ExpenseRepository } from '../../data/repositories/ExpenseRepository';
import { ScheduledExpenseRepository } from '../../data/repositories/ScheduledExpenseRepository';
import { Expense, IExpense } from '../entities/expenses/Expense';
import { IScheduledExpense, ScheduledExpense } from '../entities/expenses/ScheduledExpense';

export class ExpenseService {
  private readonly expenseRepository: ExpenseRepository;
  private readonly scheduledExpenseRepository: ScheduledExpenseRepository;

  constructor() {
    this.expenseRepository = new ExpenseRepository();
    this.scheduledExpenseRepository = new ScheduledExpenseRepository();
  }

  public async createExpense(expense: IExpense): Promise<Expense> {
    return await this.expenseRepository.create(expense);
  }

  public async getExpenseById(id: number): Promise<Expense> {
    return await this.expenseRepository.getById(id);
  }

  public async getAllExpenses(): Promise<Expense[]> {
    return await this.expenseRepository.getAll();
  }

  public async updateExpense(expense: IExpense): Promise<Expense> {
    return await this.expenseRepository.update(expense);
  }

  public async deleteExpense(id: number): Promise<void> {
    await this.expenseRepository.delete(id);
  }

  public async createScheduledExpense(
    scheduledExpense: IScheduledExpense
  ): Promise<ScheduledExpense> {
    return await this.scheduledExpenseRepository
      .create(scheduledExpense)
      .then(scheduledExpense => new ScheduledExpense(scheduledExpense));
  }

  public async getScheduledExpenseById(id: number): Promise<ScheduledExpense> {
    return await this.scheduledExpenseRepository
      .getById(id)
      .then(scheduledExpense => new ScheduledExpense(scheduledExpense));
  }

  public async getAllScheduledExpenses(): Promise<ScheduledExpense[]> {
    return await this.scheduledExpenseRepository
      .getAll()
      .then(scheduledExpenses =>
        scheduledExpenses.map(scheduledExpense => new ScheduledExpense(scheduledExpense))
      );
  }

  public async updateScheduledExpense(
    scheduledExpense: IScheduledExpense
  ): Promise<IScheduledExpense> {
    return await this.scheduledExpenseRepository.update(scheduledExpense);
  }

  public async deleteScheduledExpense(id: number): Promise<void> {
    return await this.scheduledExpenseRepository.delete(id);
  }

  public async createScheduledExpenses(): Promise<void> {
    return this.getAllScheduledExpenses().then(async scheduledExpenses => {
      for (const scheduledExpense of scheduledExpenses) {
        const pendingExpenses = scheduledExpense.getPendingOccurences(new Date());
        for (const expense of pendingExpenses) {
          await this.expenseRepository.create(expense);
        }
      }
    });
  }
}
