import { AbstractSchedule, IScheduleBase } from '../shared/AbstractSchedule';
import { Investment, InvestmentType } from './Investment';

export interface ISIP extends IScheduleBase {
  assetId: number;
  quantity?: number;
  price: number;
  executedTill?: Date;
}

export class SIP extends AbstractSchedule<Investment> implements ISIP {
  public readonly assetId: number;
  public readonly quantity?: number;
  public readonly price: number;
  public readonly executedTill?: Date;

  constructor({ id, assetId, quantity, price, startDate, endDate, frequency, executedTill }: ISIP) {
    super({ id, startDate, endDate, frequency, lastGeneratedDate: executedTill });
    this.assetId = assetId;
    this.quantity = quantity;
    this.price = price;
    this.executedTill = executedTill;
  }

  protected createDataForOccurence(date: Date): Investment {
    return new Investment({
      id: undefined,
      assetId: this.assetId,
      date: date,
      type: InvestmentType.BUY,
      quantity: this.quantity,
      price: this.price,
    });
  }
}
