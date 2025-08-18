import { LoanPayment } from './LoanPayment';
import { PaymentFrequency } from './PaymentFrequency';

export interface IPaymentSchedule {
  id?: number;
  loanId: number;
  name: string;
  amount: number;
  frequency: PaymentFrequency;
  startDate: Date;
  endDate: Date;
  lastGeneratedDate?: Date;
}

export class PaymentSchedule implements IPaymentSchedule {
  constructor(
    public readonly id: number | undefined,
    public readonly loanId: number,
    public readonly name: string,
    public readonly amount: number,
    public readonly frequency: PaymentFrequency,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly lastGeneratedDate?: Date
  ) {
    this.validateSchedule();
  }

  private validateSchedule(): void {
    if (this.loanId <= 0) {
      throw new Error('Valid loan ID is required');
    }
    if (!this.name.trim()) {
      throw new Error('Schedule name is required');
    }
    if (this.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }
    if (!this.startDate || !this.endDate) {
      throw new Error('Start date and end date are required');
    }
    if (this.endDate <= this.startDate) {
      throw new Error('End date must be after start date');
    }
  }

  // Business methods
  isActive(): boolean {
    const today = new Date();
    return today >= this.startDate && today <= this.endDate;
  }

  getNextPaymentDate(afterDate?: Date): Date | null {
    const fromDate = afterDate || this.lastGeneratedDate || this.startDate;
    const nextDate = this.calculateNextPaymentDate(fromDate);

    if (nextDate && nextDate <= this.endDate) {
      return nextDate;
    }

    return null;
  }

  generatePaymentsBetween(fromDate: Date, toDate: Date): LoanPayment[] {
    const payments: LoanPayment[] = [];
    let currentDate = new Date(Math.max(fromDate.getTime(), this.startDate.getTime()));

    // If we have a lastGeneratedDate, start from the next payment date
    if (this.lastGeneratedDate && this.lastGeneratedDate >= fromDate) {
      const nextPayment = this.getNextPaymentDate(this.lastGeneratedDate);
      if (nextPayment) {
        currentDate = nextPayment;
      } else {
        return payments; // No more payments to generate
      }
    }

    while (currentDate <= toDate && currentDate <= this.endDate) {
      const payment = new LoanPayment(
        undefined, // id will be assigned by repository
        this.loanId,
        new Date(currentDate),
        this.amount,
        currentDate <= toDate, // isPaid if date has passed
        `Generated from: ${this.name}`
      );

      payments.push(payment);

      const nextDate = this.calculateNextPaymentDate(currentDate);
      if (!nextDate || nextDate <= currentDate) {
        break; // Prevent infinite loop
      }
      currentDate = nextDate;
    }

    return payments;
  }

  private calculateNextPaymentDate(fromDate: Date): Date {
    const nextDate = new Date(fromDate);

    switch (this.frequency) {
      case PaymentFrequency.DAILY:
      case 'Daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case PaymentFrequency.WEEKLY:
      case 'Weekly':
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case PaymentFrequency.MONTHLY:
      case 'Monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case PaymentFrequency.QUARTERLY:
      case 'Quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case PaymentFrequency.HALF_YEARLY:
      case 'Half-yearly':
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case PaymentFrequency.YEARLY:
      case 'Yearly':
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
      default:
        throw new Error(`Unsupported payment frequency: ${this.frequency}`);
    }

    return nextDate;
  }

  updateLastGeneratedDate(date: Date): PaymentSchedule {
    return new PaymentSchedule(
      this.id,
      this.loanId,
      this.name,
      this.amount,
      this.frequency,
      this.startDate,
      this.endDate,
      date
    );
  }

  // Calculate total number of payments in this schedule
  getTotalPaymentCount(): number {
    let count = 0;
    let currentDate = new Date(this.startDate);

    while (currentDate <= this.endDate) {
      count++;
      currentDate = this.calculateNextPaymentDate(currentDate);

      if (count > 10000) {
        // Safety check to prevent infinite loops
        break;
      }
    }

    return count;
  }

  // Calculate total amount for this schedule
  getTotalScheduledAmount(): number {
    return this.getTotalPaymentCount() * this.amount;
  }
}
