import { Currency } from '../shared/Currency';

export interface IExpense {
  id: number | undefined;
  amount: number;
  currency: Currency;
  date: Date;
  category: string;
  isEssential: boolean;
  description: string;
}

export class Expense implements IExpense {
  public readonly id: number | undefined;
  public readonly amount: number;
  public readonly currency: Currency;
  public readonly date: Date;
  public readonly category: string;
  public readonly isEssential: boolean;
  public readonly description: string;

  constructor({ id, amount, currency, date, category, isEssential, description }: IExpense) {
    this.id = id;
    this.amount = amount;
    this.currency = currency;
    this.date = date;
    this.category = category;
    this.isEssential = isEssential;
    this.description = description;
  }

  public getMonthYear(): string {
    return this.date.getMonth().toString() + ':' + this.date.getFullYear().toString();
  }
}
