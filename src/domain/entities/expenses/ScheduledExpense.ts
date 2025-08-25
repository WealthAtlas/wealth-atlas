import { Expense } from './Expense';
import { ExpenseFrequency } from './ExpenseFrequency';

export interface IScheduledExpense {
  id: number | undefined;
  name: string;
  description: string | undefined;
  amount: number;
  currency: string;
  category: string;
  isEssential: boolean;
  frequency: ExpenseFrequency;
  startDate: Date;
  endDate: Date | undefined;
  lastGeneratedDate: Date | undefined;
}

export class ScheduledExpense implements IScheduledExpense {
  public readonly id: number | undefined;
  public readonly name: string;
  public readonly description: string | undefined;
  public readonly amount: number;
  public readonly currency: string;
  public readonly category: string;
  public readonly isEssential: boolean;
  public readonly frequency: ExpenseFrequency;
  public readonly startDate: Date;
  public readonly endDate: Date | undefined;
  public readonly lastGeneratedDate: Date | undefined;

  constructor({
    id,
    name,
    description,
    amount,
    currency,
    category,
    isEssential,
    frequency,
    startDate,
    endDate,
    lastGeneratedDate,
  }: IScheduledExpense) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.amount = amount;
    this.currency = currency;
    this.category = category;
    this.isEssential = isEssential;
    this.frequency = frequency;
    this.startDate = startDate;
    this.endDate = endDate;
    this.lastGeneratedDate = lastGeneratedDate;
  }

  public getPendingExpenses(): Expense[] {
    const expenses: Expense[] = [];
    let nextExpenseDate = this.getInitialExpenseDate();

    const today = new Date();
    while (this.shouldAddExpense(nextExpenseDate, today)) {
      expenses.push(
        new Expense({
          id: undefined,
          amount: this.amount,
          currency: this.currency,
          date: nextExpenseDate,
          category: this.category,
          isEssential: this.isEssential,
          description: this.description || '',
        })
      );
      nextExpenseDate = this.getNextOccurrenceDateTime(nextExpenseDate, this.frequency);
    }
    return expenses;
  }

  public getNextExpense(): Expense | undefined {
    const nextExpenseDate = this.getInitialExpenseDate();

    if (this.shouldAddExpense(nextExpenseDate, this.endDate)) {
      return new Expense({
        id: undefined,
        date: nextExpenseDate,
        amount: this.amount,
        currency: this.currency,
        category: this.category,
        isEssential: this.isEssential,
        description: this.description || '',
      });
    }

    return undefined;
  }

  private shouldAddExpense(nextExpenseDate: Date, till?: Date) {
    return (
      nextExpenseDate <= (till ?? new Date()) &&
      (this.endDate == null || nextExpenseDate < this.endDate)
    );
  }

  private getInitialExpenseDate(): Date {
    return this.lastGeneratedDate != null
      ? this.getNextOccurrenceDateTime(this.lastGeneratedDate!, this.frequency)
      : this.startDate;
  }

  private getNextOccurrenceDateTime(dateTime: Date, frequency: ExpenseFrequency): Date {
    switch (frequency) {
      case ExpenseFrequency.DAILY:
        return new Date(dateTime.setDate(dateTime.getDate() + 1));
      case ExpenseFrequency.WEEKLY:
        return new Date(dateTime.setDate(dateTime.getDate() + 7));
      case ExpenseFrequency.BIWEEKLY:
        return new Date(dateTime.setDate(dateTime.getDate() + 14));
      case ExpenseFrequency.MONTHLY:
        return new Date(dateTime.setMonth(dateTime.getMonth() + 1));
      case ExpenseFrequency.QUARTERLY:
        return new Date(dateTime.setMonth(dateTime.getMonth() + 3));
      case ExpenseFrequency.HALF_YEARLY:
        return new Date(dateTime.setMonth(dateTime.getMonth() + 6));
      case ExpenseFrequency.YEARLY:
        return new Date(dateTime.setFullYear(dateTime.getFullYear() + 1));
      default:
        throw new Error('Invalid frequency');
    }
  }
}
