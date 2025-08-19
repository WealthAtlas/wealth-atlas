import { InvestmentFrequency } from './InvestmentFrequency';

export interface IScheduledAssetTransaction {
  id?: number;
  assetId: number | undefined;
  transactionType: 'buy' | 'sell';
  quantity: number | undefined; // Optional for assets like FDs where quantity doesn't apply
  price: number; // Unit price (includes fees)
  scheduledDate: Date;
  frequency: InvestmentFrequency;
  endDate?: Date; // Optional end date for the schedule
  totalOccurrences?: number; // Alternative to endDate - specific number of transactions
  isActive: boolean; // Whether this schedule is currently active
  isExecuted: boolean; // Whether this specific scheduled transaction has been executed
  executedTransactionId?: number; // Reference to actual transaction if executed
}

export class ScheduledAssetTransaction implements IScheduledAssetTransaction {
  constructor(
    public readonly id: number | undefined,
    public readonly assetId: number | undefined,
    public readonly transactionType: 'buy' | 'sell',
    public readonly quantity: number | undefined,
    public readonly price: number,
    public readonly scheduledDate: Date,
    public readonly frequency: InvestmentFrequency,
    public readonly endDate: Date | undefined,
    public readonly totalOccurrences: number | undefined,
    public readonly isActive: boolean,
    public readonly isExecuted: boolean,
    public readonly executedTransactionId?: number
  ) {}

  // Get total amount for this scheduled transaction
  getTotalAmount(): number {
    return (this.quantity || 1) * this.price;
  }

  // Check if this is a quantity-based asset (has meaningful quantity)
  isQuantityBased(): boolean {
    return this.quantity !== undefined && this.quantity !== null;
  }

  // Check if this scheduled transaction is due (scheduled date has passed)
  isDue(): boolean {
    return new Date() >= this.scheduledDate && !this.isExecuted;
  }

  // Check if this scheduled transaction is overdue (past scheduled date and not executed)
  isOverdue(): boolean {
    const today = new Date();
    const scheduledDate = new Date(this.scheduledDate);
    const daysDifference = Math.floor(
      (today.getTime() - scheduledDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysDifference > 0 && !this.isExecuted;
  }

  // Get the next scheduled date based on frequency
  getNextScheduledDate(): Date {
    const nextDate = new Date(this.scheduledDate);

    switch (this.frequency) {
      case InvestmentFrequency.MONTHLY:
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
      case InvestmentFrequency.QUARTERLY:
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
      case InvestmentFrequency.SEMI_ANNUALLY:
        nextDate.setMonth(nextDate.getMonth() + 6);
        break;
      case InvestmentFrequency.ANNUALLY:
        nextDate.setFullYear(nextDate.getFullYear() + 1);
        break;
    }

    return nextDate;
  }

  // Create a copy of this scheduled transaction for the next occurrence
  createNextOccurrence(): ScheduledAssetTransaction {
    return new ScheduledAssetTransaction(
      undefined, // New transaction, so no ID
      this.assetId,
      this.transactionType,
      this.quantity,
      this.price,
      this.getNextScheduledDate(),
      this.frequency,
      this.endDate,
      this.totalOccurrences,
      this.isActive,
      false, // New occurrence is not executed
      undefined
    );
  }
}
