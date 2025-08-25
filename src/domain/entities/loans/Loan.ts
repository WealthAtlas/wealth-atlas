import { IRRCalculator, Transaction } from '../shared/IRRCalculator';
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
    const transactions: Transaction[] = [];
    //Initial loan disbursement
    transactions.push({
      date: this.startDate,
      amount: -this.principalAmount,
    });
    // Loan repayments
    transactions.push(
      ...this.payments.map(payment => ({
        date: payment.date,
        amount: payment.amount,
      }))
    );
    // Future loan repayments
    transactions.push(
      ...this.paymentSchedules.flatMap(schedule =>
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
      this.payments.map(payment => ({ date: payment.date, amount: payment.amount })),
      this.getIRR(),
      new Date()
    );
    return this.principalAmount + totalInterest;
  }
}
