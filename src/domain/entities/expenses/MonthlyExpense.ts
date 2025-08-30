import { Expense } from './Expense';

export class MonthlyExpense {
  constructor(
    public month: string,
    public expenses: Expense[]
  ) {}

  getTotalExpenses(): number {
    return this.expenses.reduce((total, expense) => total + expense.amount, 0);
  }
}
