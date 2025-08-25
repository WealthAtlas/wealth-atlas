import { AbstractSchedule, IScheduleBase } from '../shared/AbstractSchedule';
import { AssetTransaction } from './AssetTransaction';

export interface IScheduledAssetTransaction extends IScheduleBase {
  assetId: number;
  quantity?: number;
  price: number;
  executedTill?: Date;
}

export class ScheduledAssetTransaction
  extends AbstractSchedule<AssetTransaction>
  implements IScheduledAssetTransaction
{
  public readonly assetId: number;
  public readonly quantity?: number;
  public readonly price: number;
  public readonly executedTill?: Date;

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
    super({ id, startDate, endDate, frequency, lastGeneratedDate: executedTill });
    this.assetId = assetId;
    this.quantity = quantity;
    this.price = price;
    this.executedTill = executedTill;
  }

  protected createDataForOccurence(date: Date): AssetTransaction {
    return new AssetTransaction({
      id: undefined,
      assetId: this.assetId,
      date: date,
      quantity: this.quantity,
      price: this.price,
    });
  }
}
