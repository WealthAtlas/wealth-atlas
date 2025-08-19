import { Expense } from '../entities/expenses/Expense';

export interface MonthlyExpenseSummary {
  month: string; // YYYY-MM format
  currency: string;
  essentialAmount: number;
  nonEssentialAmount: number;
  totalAmount: number;
}

export interface CurrencyTotalSummary {
  currency: string;
  essentialAmount: number;
  nonEssentialAmount: number;
  totalAmount: number;
}

export class ExpenseAnalyticsService {
  static getMonthlyExpenseSummary(expenses: Expense[]): MonthlyExpenseSummary[] {
    const summaryMap = new Map<string, MonthlyExpenseSummary>();

    expenses.forEach(expense => {
      const key = `${expense.getMonthYear()}-${expense.currency}`;

      if (!summaryMap.has(key)) {
        summaryMap.set(key, {
          month: expense.getMonthYear(),
          currency: expense.currency,
          essentialAmount: 0,
          nonEssentialAmount: 0,
          totalAmount: 0,
        });
      }

      const summary = summaryMap.get(key)!;

      if (expense.isEssential) {
        summary.essentialAmount += expense.amount;
      } else {
        summary.nonEssentialAmount += expense.amount;
      }

      summary.totalAmount += expense.amount;
    });

    return Array.from(summaryMap.values()).sort((a, b) => a.month.localeCompare(b.month));
  }

  static getCurrencyTotalSummary(expenses: Expense[]): CurrencyTotalSummary[] {
    const summaryMap = new Map<string, CurrencyTotalSummary>();

    expenses.forEach(expense => {
      if (!summaryMap.has(expense.currency)) {
        summaryMap.set(expense.currency, {
          currency: expense.currency,
          essentialAmount: 0,
          nonEssentialAmount: 0,
          totalAmount: 0,
        });
      }

      const summary = summaryMap.get(expense.currency)!;

      if (expense.isEssential) {
        summary.essentialAmount += expense.amount;
      } else {
        summary.nonEssentialAmount += expense.amount;
      }

      summary.totalAmount += expense.amount;
    });

    return Array.from(summaryMap.values()).sort((a, b) => a.currency.localeCompare(b.currency));
  }

  static getLastNMonths(n: number): string[] {
    const months: string[] = [];
    const currentDate = new Date();

    for (let i = n - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      months.push(date.toISOString().substring(0, 7));
    }

    return months;
  }

  static getExpensesInDateRange(expenses: Expense[], startDate: Date, endDate: Date): Expense[] {
    return expenses.filter(expense => expense.date >= startDate && expense.date <= endDate);
  }
}
