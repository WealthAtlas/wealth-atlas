export enum InvestmentType {
  BUY = 'buy',
  SELL = 'sell',
}

export interface IInvestment {
  id: number | undefined;
  assetId: number;
  sipId?: number;
  type: InvestmentType;
  quantity: number | undefined;
  /**
   * Total value of the transaction (not a unit price), always stored positive.
   * Direction is carried by `type` alone — see getSignedAmount/getSignedQuantity.
   */
  totalAmount: number;
  date: Date;
}

export class Investment implements IInvestment {
  public readonly id: number | undefined;
  public readonly assetId: number;
  public readonly sipId?: number;
  public readonly type: InvestmentType;
  public readonly totalAmount: number;
  public readonly date: Date;
  public readonly quantity: number | undefined;

  constructor(investment: IInvestment) {
    this.id = investment.id;
    this.totalAmount = investment.totalAmount;
    this.date = new Date(investment.date);
    this.assetId = investment.assetId;
    this.quantity = investment.quantity;
    this.type = investment.type;
    this.sipId = investment.sipId;
  }

  public isSell(): boolean {
    return this.type === InvestmentType.SELL;
  }

  /** Total value with direction applied: negative for sells. */
  public getSignedAmount(): number {
    return this.isSell() ? -this.totalAmount : this.totalAmount;
  }

  /** Quantity with direction applied: negative for sells. */
  public getSignedQuantity(): number {
    if (this.quantity === undefined) return 0;
    return this.isSell() ? -this.quantity : this.quantity;
  }

  public getTotalAmount(): number {
    return this.totalAmount;
  }

  public getUnitPrice(): number {
    return this.totalAmount / (this.quantity || 1);
  }
}
