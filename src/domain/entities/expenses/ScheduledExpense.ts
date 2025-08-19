import { PaymentFrequency } from '../loans/PaymentFrequency';
import { Expense } from './Expense';
import { ExpenseCategory } from './ExpenseCategory';

export interface IScheduledExpense {
  id?: number;
  name: string;
  amount: number;
  currency: string;
  category: ExpenseCategory;
  isEssential: boolean;
  frequency: PaymentFrequency;
  startDate: Date;
  endDate?: Date;
  lastGeneratedDate?: Date;
  description?: string;
}

export class ScheduledExpense implements IScheduledExpense {
  constructor(
    public readonly id: number | undefined,
    public readonly name: string,
    public readonly amount: number,
    public readonly currency: string,
    public readonly category: ExpenseCategory,
    public readonly isEssential: boolean,
    public readonly frequency: PaymentFrequency,
    public readonly startDate: Date,
    public readonly endDate?: Date,
    public readonly lastGeneratedDate?: Date,
    public readonly description?: string
  ) {
    this.validateSchedule();
  }

  private validateSchedule(): void {
    if (!this.name.trim()) {
      throw new Error('Scheduled expense name is required');
    }
    if (this.amount <= 0) {
      throw new Error('Expense amount must be greater than zero');
    }
    if (!this.currency || this.currency.trim().length === 0) {
      throw new Error('Currency is required');
    }
    if (!this.startDate) {
      throw new Error('Start date is required');
    }
    if (this.endDate && this.endDate <= this.startDate) {
      throw new Error('End date must be after start date');
    }
  }

  // Business methods
  isActive(): boolean {
    const today = new Date();
    if (this.endDate) {
      return today >= this.startDate && today <= this.endDate;
    }
    return today >= this.startDate;
  }

  getNextExpenseDate(afterDate?: Date): Date | null {
    const fromDate = afterDate || this.lastGeneratedDate || this.startDate;
    const nextDate = this.calculateNextExpenseDate(fromDate);

    if (nextDate && (!this.endDate || nextDate <= this.endDate)) {
      return nextDate;
    }

    return null;
  }

  generateExpensesBetween(fromDate: Date, toDate: Date): Expense[] {
    const expenses: Expense[] = [];
    let currentDate = new Date(Math.max(fromDate.getTime(), this.startDate.getTime()));

    // If we have a lastGeneratedDate, start from the next expense date
    if (this.lastGeneratedDate && this.lastGeneratedDate >= fromDate) {
      const nextExpense = this.getNextExpenseDate(this.lastGeneratedDate);
      if (nextExpense) {
        currentDate = nextExpense;
      } else {
        return expenses; // No more expenses to generate
      }
    }

    while (currentDate <= toDate && (!this.endDate || currentDate <= this.endDate)) {
      const generatedDescription = this.description
        ? `${this.description} (Generated from: ${this.name})`
        : `Generated from: ${this.name}`;

      const expense = new Expense({
        amount: this.amount,
        currency: this.currency,
        date: new Date(currentDate),
        category: this.category,
        isEssential: this.isEssential,
        description: generatedDescription,
      });

      expenses.push(expense);

      const nextDate = this.calculateNextExpenseDate(currentDate);
      if (!nextDate || nextDate <= currentDate) {
        break; // Prevent infinite loop
      }
      currentDate = nextDate;
    }

    return expenses;
  }

  private calculateNextExpenseDate(fromDate: Date): Date {
    const nextDate = new Date(fromDate);

    switch (this.frequency) {
      case PaymentFrequency.DAILY:
      case 'Daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case PaymentFrequency.WEEKLY:
      case 'Weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case PaymentFrequency.MONTHLY:
      case 'Monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case PaymentFrequency.QUARTERLY:
      case 'Quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case PaymentFrequency.HALF_YEARLY:
      case 'Half-yearly':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case PaymentFrequency.YEARLY:
      case 'Yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        throw new Error(`Unsupported expense frequency: ${this.frequency}`);
    }

    return nextDate;
  }

  updateLastGeneratedDate(date: Date): ScheduledExpense {
    return new ScheduledExpense(
      this.id,
      this.name,
      this.amount,
      this.currency,
      this.category,
      this.isEssential,
      this.frequency,
      this.startDate,
      this.endDate,
      date,
      this.description
    );
  }

  // Calculate total number of expenses in this schedule
  getTotalExpenseCount(): number {
    if (!this.endDate) {
      return Infinity; // Infinite if no end date
    }

    let count = 0;
    let currentDate = new Date(this.startDate);

    while (currentDate <= this.endDate) {
      count++;
      currentDate = this.calculateNextExpenseDate(currentDate);

      if (count > 10000) {
        // Safety check to prevent infinite loops
        break;
      }
    }

    return count;
  }

  // Calculate total amount for this schedule
  getTotalScheduledAmount(): number {
    const count = this.getTotalExpenseCount();
    return count === Infinity ? Infinity : count * this.amount;
  }

  getFormattedAmount(): string {
    return `${this.currency} ${this.amount.toLocaleString()}`;
  }
}
