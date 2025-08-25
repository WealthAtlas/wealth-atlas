import { AbstractSchedule, IScheduleBase } from '../shared/AbstractSchedule';
import { LoanPayment } from './LoanPayment';

export interface IPaymentSchedule extends IScheduleBase {
  loanId: number;
  name: string;
  amount: number;
}

export class PaymentSchedule extends AbstractSchedule<LoanPayment> implements IPaymentSchedule {
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
  }: IPaymentSchedule) {
    super({ id, startDate, endDate, frequency, lastGeneratedDate });
    this.loanId = loanId;
    this.name = name;
    this.amount = amount;
  }

  protected createDataForOccurence(date: Date): LoanPayment {
    return new LoanPayment({
      id: undefined,
      date: date,
      amount: this.amount,
      description: this.name,
      loanId: this.loanId,
    });
  }
}
