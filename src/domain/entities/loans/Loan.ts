import { IRRCalculator } from '../shared/IRRCalculator';
import { LoanPayment } from './LoanPayment';
import { PaymentSchedule } from './PaymentSchedule';

export interface ILoan {
  id: number | undefined;
  name: string;
  description: string;
  lenderName: string;
  principalAmount: number;
  currency: string;
  startDate: Date;
}

export class Loan implements ILoan {
  public readonly id: number | undefined;
  public readonly name: string;
  public readonly description: string;
  public readonly lenderName: string;
  public readonly principalAmount: number;
  public readonly currency: string;
  public readonly startDate: Date;
  public readonly payments: LoanPayment[];
  public readonly paymentSchedules: PaymentSchedule[];

  constructor({
    id,
    name,
    lenderName,
    principalAmount,
    currency,
    startDate,
    description,
    payments,
    paymentSchedules,
  }: ILoan & { payments: LoanPayment[]; paymentSchedules: PaymentSchedule[] }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.lenderName = lenderName;
    this.principalAmount = principalAmount;
    this.currency = currency;
    this.startDate = startDate;
    this.payments = payments;
    this.paymentSchedules = paymentSchedules;
  }

  public getIRR(): number {
    const transactions = [];
    transactions.push(
      ...this.payments.map(payment => ({
        date: payment.date,
        amount: payment.amount,
      }))
    );
    transactions.push({
      date: this.startDate,
      amount: this.principalAmount,
    });
    transactions.push(...this.paymentSchedules.map(schedule => schedule.lastGeneratedDate));

    return IRRCalculator.getInstance().calculateIRR({
      transactions: this.payments.map(payment => ({
        date: payment.date,
        amount: payment.amount,
      })),
      value: this.principalAmount,
      valueUpdatedOn: this.startDate,
    });
  }
}
