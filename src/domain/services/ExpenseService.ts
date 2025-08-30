import { AutoPayRepository } from '../../data/repositories/expense/AutoPayRepository';
import { ExpenseRepository } from '../../data/repositories/expense/ExpenseRepository';
import { AutoPay, IAutoPay } from '../entities/expenses/AutoPay';
import { Expense, IExpense } from '../entities/expenses/Expense';
import { MonthlyExpense } from '../entities/expenses/MonthlyExpense';

export class ExpenseService {
  private readonly expenseRepository: ExpenseRepository;
  private readonly scheduledExpenseRepository: AutoPayRepository;

  constructor() {
    this.expenseRepository = new ExpenseRepository();
    this.scheduledExpenseRepository = new AutoPayRepository();
  }

  public async createExpense(expense: IExpense): Promise<Expense> {
    return await this.expenseRepository.create(expense).then(this.toExpense);
  }

  public async getExpenseById(id: number): Promise<Expense> {
    return await this.expenseRepository.getById(id).then(this.toExpense);
  }

  public async getExpenses(): Promise<Expense[]> {
    return await this.expenseRepository.getAll().then(async expenses => {
      const expensePromises = expenses.map(expense => this.toExpense(expense));
      return await Promise.all(expensePromises);
    });
  }

  public async getMonthlyExpenses(): Promise<MonthlyExpense[]> {
    return await this.expenseRepository.getAll().then(async expenses => {
      const expensePromises = expenses.map(expense => this.toExpense(expense));
      const resolvedExpenses = await Promise.all(expensePromises);

      const monthlyExpensesMap = new Map<string, MonthlyExpense>();

      resolvedExpenses.forEach(expense => {
        const month = expense.date.toISOString().slice(0, 7); // YYYY-MM
        if (!monthlyExpensesMap.has(month)) {
          monthlyExpensesMap.set(month, new MonthlyExpense(new Date(month), []));
        }
        monthlyExpensesMap.get(month)?.expenses.push(expense);
      });

      return Array.from(monthlyExpensesMap.values());
    });
  }

  public async updateExpense(expense: IExpense): Promise<Expense> {
    return await this.expenseRepository.update(expense).then(this.toExpense);
  }

  public async deleteExpense(id: number): Promise<void> {
    await this.expenseRepository.delete(id);
  }

  public async createScheduledExpense(scheduledExpense: IAutoPay): Promise<AutoPay> {
    return await this.scheduledExpenseRepository
      .create(scheduledExpense)
      .then(scheduledExpense => new AutoPay(scheduledExpense));
  }

  public async getScheduledExpenseById(id: number): Promise<AutoPay> {
    return await this.scheduledExpenseRepository
      .getById(id)
      .then(scheduledExpense => new AutoPay(scheduledExpense));
  }

  public async getAllScheduledExpenses(): Promise<AutoPay[]> {
    return await this.scheduledExpenseRepository
      .getAll()
      .then(scheduledExpenses =>
        scheduledExpenses.map(scheduledExpense => new AutoPay(scheduledExpense))
      );
  }

  public async updateScheduledExpense(scheduledExpense: IAutoPay): Promise<IAutoPay> {
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

  private async toExpense(expense: IExpense): Promise<Expense> {
    return new Expense(expense);
  }
}
