import { ExpenseCategory } from './ExpenseCategory';

export interface IExpense {
  id?: number;
  amount: number;
  currency: string;
  date: Date;
  category: ExpenseCategory;
  isEssential: boolean;
  description?: string;
}

export class Expense implements IExpense {
  id?: number;
  amount: number;
  currency: string;
  date: Date;
  category: ExpenseCategory;
  isEssential: boolean;
  description?: string;

  constructor(data: IExpense) {
    this.id = data.id;
    this.amount = data.amount;
    this.currency = data.currency;
    this.date = data.date;
    this.category = data.category;
    this.isEssential = data.isEssential;
    this.description = data.description;

    this.validateAmount();
    this.validateCurrency();
    this.validateDate();
  }

  private validateAmount(): void {
    if (this.amount <= 0) {
      throw new Error('Expense amount must be greater than zero');
    }
  }

  private validateCurrency(): void {
    if (!this.currency || this.currency.trim().length === 0) {
      throw new Error('Currency is required');
    }
  }

  private validateDate(): void {
    if (!this.date || this.date > new Date()) {
      throw new Error('Expense date cannot be in the future');
    }
  }

  getFormattedAmount(): string {
    return `${this.currency} ${this.amount.toLocaleString()}`;
  }

  getMonthYear(): string {
    return this.date.toISOString().substring(0, 7); // YYYY-MM format
  }

  isInMonth(year: number, month: number): boolean {
    return this.date.getFullYear() === year && this.date.getMonth() === month - 1;
  }
}
