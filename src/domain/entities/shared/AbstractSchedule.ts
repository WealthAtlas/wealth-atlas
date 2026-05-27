import { Frequency } from './Frequency';

/**
 * Abstract base class for all scheduled entities (Expense, AssetTransaction, LoanPayment, etc).
 * Handles scheduling logic: next occurrence, should add, initial date, etc.
 * T = Domain object type (Expense, LoanPayment, AssetTransaction, ...)
 * F = Frequency enum type (ExpenseFrequency, InvestmentFrequency, PaymentFrequency, ...)
 */
export interface IScheduleBase {
  id: number | undefined;
  startDate: Date;
  endDate?: Date;
  frequency: Frequency;
  lastGeneratedDate?: Date;
}

export abstract class AbstractSchedule<T> implements IScheduleBase {
  public readonly id: number | undefined;
  public readonly startDate: Date;
  public readonly endDate?: Date;
  public readonly frequency: Frequency;
  public readonly lastGeneratedDate?: Date;

  constructor({ id, startDate, endDate, frequency, lastGeneratedDate }: IScheduleBase) {
    this.id = id;
    this.startDate = new Date(startDate);
    this.endDate = endDate ? new Date(endDate) : undefined;
    this.frequency = frequency;
    this.lastGeneratedDate = lastGeneratedDate ? new Date(lastGeneratedDate) : undefined;
  }

  /**
   * Returns the next occurrence date after lastGeneratedDate (or startDate if never generated).
   */
  public getNextOccurrenceDate(): Date {
    return this.lastGeneratedDate != null
      ? this.getNextOccurrenceDateTime(this.lastGeneratedDate, this.frequency)
      : new Date(this.startDate);
  }

  /**
   * Returns true if a new item should be generated for the given date.
   * @param nextDate The date to check
   * @param till The upper bound (defaults to today)
   */
  protected shouldAdd(nextDate: Date, till?: Date): boolean {
    return (
      nextDate <= (till ?? this.endDate ?? new Date()) &&
      (this.endDate == null || nextDate < this.endDate)
    );
  }

  /**
   * Returns the next occurrence date based on frequency.
   * @param dateTime The base date
   * @param frequency The frequency enum
   */
  protected getNextOccurrenceDateTime(dateTime: Date, frequency: Frequency): Date {
    switch (frequency) {
      case Frequency.DAILY:
        return new Date(dateTime.getTime() + 24 * 60 * 60 * 1000);
      case Frequency.WEEKLY:
        return new Date(dateTime.getTime() + 7 * 24 * 60 * 60 * 1000);
      case Frequency.BIWEEKLY:
        return new Date(dateTime.getTime() + 14 * 24 * 60 * 60 * 1000);
      case Frequency.MONTHLY: {
        const d = new Date(dateTime);
        d.setMonth(d.getMonth() + 1);
        return d;
      }
      case Frequency.QUARTERLY: {
        const d = new Date(dateTime);
        d.setMonth(d.getMonth() + 3);
        return d;
      }
      case Frequency.SEMI_ANNUALLY: {
        const d = new Date(dateTime);
        d.setMonth(d.getMonth() + 6);
        return d;
      }
      case Frequency.ANNUALLY: {
        const d = new Date(dateTime);
        d.setFullYear(d.getFullYear() + 1);
        return d;
      }
      default:
        throw new Error('Invalid frequency');
    }
  }

  public getNextOccurrenceData(): T | undefined {
    const nextOccurrenceDate = this.getNextOccurrenceDate();
    if (this.shouldAdd(nextOccurrenceDate)) {
      return this.createDataForOccurrence(nextOccurrenceDate);
    }
    return undefined;
  }

  public getPendingOccurrences(till?: Date): T[] {
    const pendingOccurrences: T[] = [];
    let nextOccurrenceDate = this.getNextOccurrenceDate();
    while (this.shouldAdd(nextOccurrenceDate, till)) {
      pendingOccurrences.push(this.createDataForOccurrence(nextOccurrenceDate));
      nextOccurrenceDate = this.getNextOccurrenceDateTime(nextOccurrenceDate, this.frequency);
    }
    return pendingOccurrences;
  }

  protected abstract createDataForOccurrence(date: Date): T;
}
