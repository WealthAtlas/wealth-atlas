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

  /**
   * `emiId` is what makes the payment cascade work: editing or deleting an EMI
   * removes the payments it generated via `deleteByEMIId`, which can only find
   * rows that carry the reference back.
   */
  protected createDataForOccurrence(date: Date): Payment {
    return new Payment({
      id: undefined,
      emiId: this.id,
      date: date,
      amount: this.amount,
      description: this.name,
      loanId: this.loanId,
    });
  }
}
