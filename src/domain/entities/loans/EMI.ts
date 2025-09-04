import { AbstractSchedule, IScheduleBase } from '../shared/AbstractSchedule';
import { Payment } from './Payment';

export interface IEMI extends IScheduleBase {
  loanId: number;
  name: string;
  amount: number;
}

export class EMI extends AbstractSchedule<Payment> implements IEMI {
  public readonly loanId: number;
  public readonly name: string;
  public readonly amount: number;

  constructor({
    id,
    loanId,
    name,
    amount,
    frequency,
    startDate,
    endDate,
    lastGeneratedDate,
  }: IEMI) {
    super({ id, startDate, endDate, frequency, lastGeneratedDate });
    this.loanId = loanId;
    this.name = name;
    this.amount = amount;
  }

  protected createDataForOccurence(date: Date): Payment {
    return new Payment({
      id: undefined,
      date: date,
      amount: this.amount,
      description: this.name,
      loanId: this.loanId,
    });
  }
}
