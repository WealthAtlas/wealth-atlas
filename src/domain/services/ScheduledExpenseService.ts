import { ExpenseRepository } from '@/data/repositories/ExpenseRepository';
import { ScheduledExpenseRepository } from '@/data/repositories/ScheduledExpenseRepository';
import { Expense } from '@/domain/entities/expenses/Expense';
import { ScheduledExpense } from '@/domain/entities/expenses/ScheduledExpense';
import { Logger } from '@/domain/utils/Logger';

export class ScheduledExpenseService {
  private scheduledExpenseRepository: ScheduledExpenseRepository;
  private expenseRepository: ExpenseRepository;

  constructor() {
    this.scheduledExpenseRepository = new ScheduledExpenseRepository();
    this.expenseRepository = new ExpenseRepository();
  }

  /**
   * Auto-generate expenses from scheduled expenses on application startup
   * This should be called when the application initializes
   */
  async processScheduledExpenses(): Promise<void> {
    try {
      const activeSchedules = await this.scheduledExpenseRepository.findActive();
      const today = new Date();

      for (const schedule of activeSchedules) {
        await this.generateExpensesForSchedule(schedule, today);
      }
    } catch (error) {
      Logger.error('Failed to process scheduled expenses:', error);
    }
  }

  /**
   * Generate expenses for a specific schedule up to the given date
   */
  async generateExpensesForSchedule(schedule: ScheduledExpense, upToDate: Date): Promise<void> {
    const startDate = schedule.lastGeneratedDate || schedule.startDate;
    const expenses = schedule.generateExpensesBetween(startDate, upToDate);

    if (expenses.length === 0) {
      return;
    }

    // Save all generated expenses
    for (const expense of expenses) {
      await this.expenseRepository.save(expense);
    }

    // Update the last generated date for the schedule
    const latestExpenseDate = expenses[expenses.length - 1].date;
    await this.scheduledExpenseRepository.updateLastGeneratedDate(schedule.id!, latestExpenseDate);
  }

  /**
   * Get all scheduled expenses
   */
  async getAllScheduledExpenses(): Promise<ScheduledExpense[]> {
    return this.scheduledExpenseRepository.findAll();
  }

  /**
   * Get active scheduled expenses
   */
  async getActiveScheduledExpenses(): Promise<ScheduledExpense[]> {
    return this.scheduledExpenseRepository.findActive();
  }

  /**
   * Save a scheduled expense
   */
  async saveScheduledExpense(scheduledExpense: ScheduledExpense): Promise<ScheduledExpense> {
    return this.scheduledExpenseRepository.save(scheduledExpense);
  }

  /**
   * Delete a scheduled expense
   */
  async deleteScheduledExpense(id: number): Promise<void> {
    await this.scheduledExpenseRepository.delete(id);
  }

  /**
   * Get the next few upcoming expenses for a schedule (for preview purposes)
   */
  getUpcomingExpenses(schedule: ScheduledExpense, count: number = 5): Expense[] {
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setFullYear(futureDate.getFullYear() + 1); // Look ahead 1 year

    const allFutureExpenses = schedule.generateExpensesBetween(today, futureDate);
    return allFutureExpenses.slice(0, count);
  }

  /**
   * Calculate total monthly expense for all active schedules
   */
  async getMonthlyExpenseTotal(): Promise<Map<string, number>> {
    const activeSchedules = await this.getActiveScheduledExpenses();
    const monthlyTotals = new Map<string, number>();

    for (const schedule of activeSchedules) {
      const currency = schedule.currency;
      const currentTotal = monthlyTotals.get(currency) || 0;

      // Convert frequency to monthly amount
      let monthlyAmount = 0;
      switch (schedule.frequency) {
        case 'Daily':
          monthlyAmount = schedule.amount * 30; // Approximate
          break;
        case 'Weekly':
          monthlyAmount = schedule.amount * 4.33; // Approximate weeks per month
          break;
        case 'Monthly':
          monthlyAmount = schedule.amount;
          break;
        case 'Quarterly':
          monthlyAmount = schedule.amount / 3;
          break;
        case 'Half-yearly':
          monthlyAmount = schedule.amount / 6;
          break;
        case 'Yearly':
          monthlyAmount = schedule.amount / 12;
          break;
        default:
          monthlyAmount = 0;
      }

      monthlyTotals.set(currency, currentTotal + monthlyAmount);
    }

    return monthlyTotals;
  }
}
