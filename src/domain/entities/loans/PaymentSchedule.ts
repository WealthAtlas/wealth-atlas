import { LoanPayment } from './LoanPayment';
import { PaymentFrequency } from './PaymentFrequency';

export interface IPaymentSchedule {
  id: number | undefined;
  loanId: number;
  name: string;
  amount: number;
  frequency: PaymentFrequency;
  startDate: Date;
  endDate: Date;
  lastGeneratedDate: Date | undefined;
}

export class PaymentSchedule implements IPaymentSchedule {
  public readonly id: number | undefined;
  public readonly loanId: number;
  public readonly name: string;
  public readonly amount: number;
  public readonly frequency: PaymentFrequency;
  public readonly startDate: Date;
  public readonly endDate: Date;
  public readonly lastGeneratedDate: Date | undefined;

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
    this.id = id;
    this.loanId = loanId;
    this.name = name;
    this.amount = amount;
    this.frequency = frequency;
    this.startDate = startDate;
    this.endDate = endDate;
    this.lastGeneratedDate = lastGeneratedDate;
  }

  public getPendingPayments(): LoanPayment[] {
    const payments: LoanPayment[] = [];
    let nextExpenseDate = this.getInitialPaymentDate();

    const today = new Date();
    while (this.shouldAddPayment(nextExpenseDate, today)) {
      payments.push(
        new LoanPayment({
          id: undefined,
          amount: this.amount,
          date: nextExpenseDate,
          description: this.name,
          loanId: this.loanId,
        })
      );
      nextExpenseDate = this.getNextOccurrenceDateTime(nextExpenseDate, this.frequency);
    }
    return payments;
  }

  public getNextPayment(): LoanPayment | undefined {
    const nextPaymentDate = this.getInitialPaymentDate();

    if (this.shouldAddPayment(nextPaymentDate, this.endDate)) {
      return new LoanPayment({
        id: undefined,
        amount: this.amount,
        date: nextPaymentDate,
        description: this.name,
        loanId: this.loanId,
      });
    }

    return undefined;
  }

  private shouldAddPayment(nextPaymentDate: Date, till?: Date) {
    return (
      nextPaymentDate <= (till ?? new Date()) &&
      (this.endDate == null || nextPaymentDate < this.endDate)
    );
  }

  private getInitialPaymentDate(): Date {
    return this.lastGeneratedDate != null
      ? this.getNextOccurrenceDateTime(this.lastGeneratedDate!, this.frequency)
      : this.startDate;
  }

  private getNextOccurrenceDateTime(dateTime: Date, frequency: PaymentFrequency): Date {
    switch (frequency) {
      case PaymentFrequency.DAILY:
        return new Date(dateTime.setDate(dateTime.getDate() + 1));
      case PaymentFrequency.WEEKLY:
        return new Date(dateTime.setDate(dateTime.getDate() + 7));
      case PaymentFrequency.BIWEEKLY:
        return new Date(dateTime.setDate(dateTime.getDate() + 14));
      case PaymentFrequency.MONTHLY:
        return new Date(dateTime.setMonth(dateTime.getMonth() + 1));
      case PaymentFrequency.QUARTERLY:
        return new Date(dateTime.setMonth(dateTime.getMonth() + 3));
      case PaymentFrequency.HALF_YEARLY:
        return new Date(dateTime.setMonth(dateTime.getMonth() + 6));
      case PaymentFrequency.YEARLY:
        return new Date(dateTime.setFullYear(dateTime.getFullYear() + 1));
      default:
        throw new Error('Invalid frequency');
    }
  }
}
