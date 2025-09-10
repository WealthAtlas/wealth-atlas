import { IRRCalculator, Transaction } from '../shared/IRRCalculator';
import { EMI } from './EMI';
import { Payment } from './Payment';

export interface ILoan {
  id: number | undefined;
  name: string;
  description: string;
  principalAmount: number;
  currency: string;
  startDate: Date;
}

export class Loan implements ILoan {
  public readonly id: number | undefined;
  public readonly name: string;
  public readonly description: string;
  public readonly principalAmount: number;
  public readonly currency: string;
  public readonly startDate: Date;
  public readonly payments: Payment[];
  public readonly emis: EMI[];

  constructor({
    id,
    name,
    principalAmount,
    currency,
    startDate,
    description,
    payments,
    emis,
  }: ILoan & { payments: Payment[]; emis: EMI[] }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.principalAmount = principalAmount;
    this.currency = currency;
    this.startDate = new Date(startDate);
    this.payments = payments;
    this.emis = emis;
  }

  public getIRR(): number {
    const transactions: Transaction[] = [];
    //Initial loan disbursement
    transactions.push({
      date: new Date(this.startDate),
      amount: -this.principalAmount,
    });
    // Loan repayments
    transactions.push(
      ...this.payments.map(payment => ({
        date: new Date(payment.date),
        amount: payment.amount,
      }))
    );
    // Future loan repayments
    transactions.push(
      ...this.emis.flatMap(schedule =>
        schedule.getPendingOccurences().map(payment => ({
          date: payment.date,
          amount: payment.amount,
        }))
      )
    );

    return IRRCalculator.getInstance().calculateIRR({
      transactions: transactions,
      value: transactions.reduce((sum, t) => sum + t.amount, 0) - this.principalAmount,
      valueUpdatedOn: this.startDate,
    });
  }

  public getOutstandingPrincipal(): number {
    const totalInterest = IRRCalculator.getInstance().calculateFutureValueOnIRR(
      this.payments.map(payment => ({ date: new Date(payment.date), amount: payment.amount })),
      this.getIRR(),
      new Date()
    );
    return this.principalAmount + totalInterest;
  }
}
