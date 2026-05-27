import { ExpenseRepository } from '@/data/repositories/expense/ExpenseRepository';
import { Expense, IExpense } from '../entities/expenses/Expense';
import { MonthlyExpense } from '../entities/expenses/MonthlyExpense';
import { monthKey } from '../utils/DateUtils';

export class ExpenseService {
  private readonly expenseRepository: ExpenseRepository;

  constructor() {
    this.expenseRepository = new ExpenseRepository();
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
      return (await Promise.all(expensePromises)).sort(
        (a, b) => a.date.getTime() - b.date.getTime()
      );
    });
  }

  public async getMonthlyExpenses(): Promise<MonthlyExpense[]> {
    const expenses = await this.expenseRepository.getAll();
    const resolvedExpenses = await Promise.all(expenses.map(expense => this.toExpense(expense)));

    const monthlyExpensesMap = new Map<string, MonthlyExpense>();

    resolvedExpenses.forEach(expense => {
      const key = this.generateMonthlyExpenseKey(expense);

      if (!monthlyExpensesMap.has(key)) {
        monthlyExpensesMap.set(
          key,
          new MonthlyExpense(new Date(expense.date.getFullYear(), expense.date.getMonth()), [])
        );
      }

      monthlyExpensesMap.get(key)?.expenses.push(expense);
    });

    return Array.from(monthlyExpensesMap.values()).sort(
      (a, b) => b.month.getTime() - a.month.getTime()
    );
  }

  private generateMonthlyExpenseKey(expense: Expense): string {
    return monthKey(expense.date);
  }

  public async updateExpense(expense: IExpense): Promise<Expense> {
    return await this.expenseRepository.update(expense).then(this.toExpense);
  }

  public async deleteExpense(id: number): Promise<void> {
    await this.expenseRepository.delete(id);
  }

  private async toExpense(expense: IExpense): Promise<Expense> {
    return new Expense(expense);
  }
}
