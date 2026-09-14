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
    const transactions: Transaction[] = this.getScheduledPayments().map(payment => ({
      date: new Date(payment.date),
      amount: payment.amount,
    }));

    return -IRRCalculator.getInstance().calculateIRR({
      transactions: transactions,
      value: this.principalAmount,
      valueUpdatedOn:
        transactions.length > 0 ? transactions[transactions.length - 1]?.date : new Date(),
    });
  }

  public getTotalAmount(): number {
    return this.getScheduledPayments().reduce((sum, payment) => sum + payment.amount, 0);
  }

  public getPaidAmount(): number {
    return this.payments.reduce((sum, payment) => sum + payment.amount, 0);
  }

  public getOutstandingAmount(): number {
    return this.getTotalAmount() - this.getPaidAmount();
  }

  public getInterestAmount(): number {
    return this.getTotalAmount() - this.principalAmount;
  }

  /**
   * Total interest as a share of the principal, over the whole life of the
   * loan -- not annualised, unlike `getIRR()`. A 12% IRR on a 20-year loan and
   * a 12% IRR on a 2-year loan cost very different multiples of the principal;
   * this is the figure that answers "how much do I pay back in total, as a
   * percentage of what I borrowed".
   */
  public getOverallInterestRate(): number {
    return this.principalAmount > 0 ? (this.getInterestAmount() / this.principalAmount) * 100 : 0;
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

  /**
   * The full set of instalments a loan's cost is measured against: every EMI
   * occurrence its schedules describe, from `startDate` to `endDate`,
   * regardless of how many have actually been generated as `Payment` rows or
   * marked paid -- plus any payment recorded outside an EMI schedule (a
   * manual prepayment, `emiId` unset), which no schedule knows about and so
   * must be taken from the actual record. Basing this on `this.payments` for
   * the EMI-linked share instead would make `getIRR()`/`getTotalAmount()`
   * drift as instalments get materialized, and would silently drop every
   * instalment past today for a schedule left open-ended.
   */
  private getScheduledPayments(): Payment[] {
    const manualPayments = this.payments.filter(payment => payment.emiId == null);
    const emiPayments = this.emis.flatMap(emi => emi.getAllOccurrences());
    return manualPayments.concat(emiPayments).sort((a, b) => a.date.getTime() - b.date.getTime());
  }
}
