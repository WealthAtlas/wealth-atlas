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
    this.startDate = startDate;
    this.endDate = endDate;
    this.frequency = frequency;
    this.lastGeneratedDate = lastGeneratedDate;
  }

  /**
   * Returns the next occurrence date after lastGeneratedDate (or startDate if never generated).
   */
  public getNextOccurenceDate(): Date {
    return this.lastGeneratedDate != null
      ? this.getNextOccurrenceDateTime(this.lastGeneratedDate, this.frequency)
      : this.startDate;
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

  public getNextOccurenceData(): T | undefined {
    const nextOccurenceDate = this.getNextOccurenceDate();
    if (this.shouldAdd(nextOccurenceDate)) {
      return this.createDataForOccurence(nextOccurenceDate);
    }
    return undefined;
  }

  public getPendingOccurences(till?: Date): T[] {
    const pendingOccurences: T[] = [];
    let nextOccurenceDate = this.getNextOccurenceDate();
    while (this.shouldAdd(nextOccurenceDate, till)) {
      pendingOccurences.push(this.createDataForOccurence(nextOccurenceDate));
      nextOccurenceDate = this.getNextOccurrenceDateTime(nextOccurenceDate, this.frequency);
    }
    return pendingOccurences;
  }

  protected abstract createDataForOccurence(date: Date): T;
}
