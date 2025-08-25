import { AssetTransaction } from './AssetTransaction';
import { InvestmentFrequency } from './InvestmentFrequency';

export interface IScheduledAssetTransaction {
  id: number | undefined;
  assetId: number;
  quantity: number | undefined;
  price: number;
  startDate: Date;
  endDate: Date | undefined;
  frequency: InvestmentFrequency;
  executedTill: Date | undefined;
}

export class ScheduledAssetTransaction implements IScheduledAssetTransaction {
  public readonly id: number | undefined;
  public readonly assetId: number;
  public readonly quantity: number | undefined;
  public readonly price: number;
  public readonly startDate: Date;
  public readonly endDate: Date | undefined;
  public readonly frequency: InvestmentFrequency;
  public readonly executedTill: Date | undefined;

  constructor({
    id,
    assetId,
    quantity,
    price,
    startDate,
    endDate,
    frequency,
    executedTill,
  }: IScheduledAssetTransaction) {
    this.id = id;
    this.assetId = assetId;
    this.quantity = quantity;
    this.price = price;
    this.startDate = startDate;
    this.endDate = endDate;
    this.frequency = frequency;
    this.executedTill = executedTill;
  }

  public getFuturePayments(till: Date): AssetTransaction[] {
    const payments: AssetTransaction[] = [];
    var nextPaymentDate = this.getInitialPaymentDate();

    while (this.shouldAddPayment(nextPaymentDate, till)) {
      payments.push(
        new AssetTransaction({
          id: undefined,
          assetId: this.assetId,
          date: nextPaymentDate,
          quantity: this.quantity,
          price: this.price,
        })
      );
      nextPaymentDate = this.getNextOccurrenceDateTime(nextPaymentDate, this.frequency);
    }

    return payments;
  }

  public getNextPayment(): AssetTransaction | undefined {
    const nextPaymentDate = this.getInitialPaymentDate();

    if (this.shouldAddPayment(nextPaymentDate, this.endDate)) {
      return new AssetTransaction({
        id: undefined,
        assetId: this.assetId,
        date: nextPaymentDate,
        quantity: this.quantity,
        price: this.price,
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
    return this.executedTill != null
      ? this.getNextOccurrenceDateTime(this.executedTill!, this.frequency)
      : this.startDate;
  }

  private getNextOccurrenceDateTime(dateTime: Date, frequency: InvestmentFrequency): Date {
    switch (frequency) {
      case InvestmentFrequency.DAILY:
        return new Date(dateTime.setDate(dateTime.getDate() + 1));
      case InvestmentFrequency.WEEKLY:
        return new Date(dateTime.setDate(dateTime.getDate() + 7));
      case InvestmentFrequency.BIWEEKLY:
        return new Date(dateTime.setDate(dateTime.getDate() + 14));
      case InvestmentFrequency.MONTHLY:
        return new Date(dateTime.setMonth(dateTime.getMonth() + 1));
      case InvestmentFrequency.QUARTERLY:
        return new Date(dateTime.setMonth(dateTime.getMonth() + 3));
      case InvestmentFrequency.SEMI_ANNUALLY:
        return new Date(dateTime.setMonth(dateTime.getMonth() + 6));
      case InvestmentFrequency.ANNUALLY:
        return new Date(dateTime.setFullYear(dateTime.getFullYear() + 1));
      default:
        throw new Error('Invalid frequency');
    }
  }
}
