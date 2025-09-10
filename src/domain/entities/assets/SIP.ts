import { AbstractSchedule, IScheduleBase } from '../shared/AbstractSchedule';
import { Investment, InvestmentType } from './Investment';

export interface ISIP extends IScheduleBase {
  assetId: number;
  quantity?: number;
  price: number;
}

export class SIP extends AbstractSchedule<Investment> implements ISIP {
  public readonly assetId: number;
  public readonly quantity?: number;
  public readonly price: number;

  constructor({
    id,
    assetId,
    quantity,
    price,
    startDate,
    endDate,
    frequency,
    lastGeneratedDate,
  }: ISIP) {
    super({ id, startDate, endDate, frequency, lastGeneratedDate });
    this.assetId = assetId;
    this.quantity = quantity;
    this.price = price;
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
