import { Currency } from '../shared/Currency';
import { IRRCalculator, Transaction } from '../shared/IRRCalculator';
import { EMI, IEMI } from './EMI';
import { IPayment, Payment } from './Payment';
import { utcDay, utcToday } from '../../utils/DateUtils';

export interface ILoan {
  id: number | undefined;
  name: string;
  description: string;
  principalAmount: number;
  currency: Currency;
  startDate: Date;
}

export class Loan implements ILoan {
  public readonly id: number | undefined;
  public readonly name: string;
  public readonly description: string;
  public readonly principalAmount: number;
  public readonly currency: Currency;
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
  }: ILoan & { payments: IPayment[]; emis: IEMI[] }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.principalAmount = principalAmount;
    this.currency = currency;
    this.startDate = utcDay(startDate);
    this.payments = payments.map(payment => new Payment(payment));
    this.emis = emis.map(emi => new EMI(emi));
  }

  public getIRR(): number {
    const transactions: Transaction[] = [];
    transactions.push(
      ...this.getPayments(undefined, true).map(payment => ({
        date: new Date(payment.date),
        amount: payment.amount,
      }))
    );

    return -IRRCalculator.getInstance().calculateIRR({
      transactions: transactions,
      value: this.principalAmount,
      valueUpdatedOn:
        transactions.length > 0 ? transactions[transactions.length - 1]?.date : new Date(),
    });
  }

  public getTotalAmount(): number {
    return this.getPayments(undefined, true).reduce((sum, payment) => sum + payment.amount, 0);
  }

  public getPaidAmount(): number {
    return this.getPayments().reduce((sum, payment) => sum + payment.amount, 0);
  }

  public getOutstandingAmount(): number {
    return this.getTotalAmount() - this.getPaidAmount();
  }

  public getInterestAmount(): number {
    return this.getTotalAmount() - this.principalAmount;
  }

  public isFullyPaid(): boolean {
    return this.getOutstandingAmount() <= 0;
  }

  public getNextPaymentDate(): Date | undefined {
    const pendingPayments = this.emis
      .flatMap(schedule => schedule.getPendingOccurrences())
      .map(occurrence => occurrence.date)
      // A payment due today is still pending. Comparing a calendar day against
      // `new Date()` made it past from one minute after midnight UTC onwards.
      .filter(date => date >= utcToday())
      .sort((a, b) => a.getTime() - b.getTime());
    return pendingPayments.length > 0 ? pendingPayments[0] : undefined;
  }

  public getPendingPaymentsCount(): number {
    return this.emis
      .flatMap(schedule => schedule.getPendingOccurrences())
      .map(occurrence => occurrence.date)
      .filter(date => date >= utcToday()).length;
  }

  public getPaidPaymentsCount(): number {
    return this.payments.length;
  }

  private getPayments(till?: Date, considerFutureTransactions: boolean = false): Payment[] {
    if (till) {
      return this.payments
        .filter(payment => payment.date <= till)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    }
    if (considerFutureTransactions) {
      const futureTransactions = this.emis
        .map(emi => emi.getPendingOccurrences(till))
        .flat()
        .map(
          occurrence =>
            new Payment({
              id: undefined,
              date: new Date(occurrence.date),
              amount: occurrence.amount,
              description: occurrence.description,
              loanId: occurrence.loanId,
            })
        );
      return this.payments.concat(futureTransactions);
    }
    return this.payments.sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
