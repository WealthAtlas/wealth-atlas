import { Currency } from '../shared/Currency';
import { Expense } from './Expense';

export class MonthlyExpense {
  constructor(
    public month: Date,
    public currency: Currency,
    public expenses: Expense[]
  ) {}

  getTotalAmount(): number {
    return this.expenses.reduce((total, expense) => total + expense.amount, 0);
  }

  getEssentialAmount(): number {
    return this.expenses
      .filter(expense => expense.isEssential)
      .reduce((total, expense) => total + expense.amount, 0);
  }

  getNonEssentialAmount(): number {
    return this.expenses
      .filter(expense => !expense.isEssential)
      .reduce((total, expense) => total + expense.amount, 0);
  }
}
