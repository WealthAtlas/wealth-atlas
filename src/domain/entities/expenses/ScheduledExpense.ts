import { AbstractSchedule, IScheduleBase } from '../shared/AbstractSchedule';
import { Expense } from './Expense';

export interface IScheduledExpense extends IScheduleBase {
  name: string;
  description: string;
  amount: number;
  currency: string;
  category: string;
  isEssential: boolean;
  lastGeneratedDate: Date | undefined;
}

export class ScheduledExpense extends AbstractSchedule<Expense> implements IScheduledExpense {
  public readonly name: string;
  public readonly description: string;
  public readonly amount: number;
  public readonly currency: string;
  public readonly category: string;
  public readonly isEssential: boolean;
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
    super({ id, startDate, endDate, frequency, lastGeneratedDate });
    this.name = name;
    this.description = description;
    this.amount = amount;
    this.currency = currency;
    this.category = category;
    this.isEssential = isEssential;
    this.lastGeneratedDate = lastGeneratedDate;
  }

  protected createDataForOccurence(date: Date): Expense {
    return new Expense({
      id: undefined,
      date: date,
      amount: this.amount,
      currency: this.currency,
      category: this.category,
      isEssential: this.isEssential,
      description: this.description || '',
    });
  }
}
