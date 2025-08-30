export enum InvestmentType {
  BUY = 'buy',
  SELL = 'sell',
}

export interface IInvestment {
  id: number | undefined;
  assetId: number;
  type: InvestmentType;
  quantity: number | undefined;
  price: number; // Unit price (includes fees)
  date: Date;
}

export class Investment implements IInvestment {
  public readonly id: number | undefined;
  public readonly assetId: number;
  public readonly type: InvestmentType;
  public readonly price: number;
  public readonly date: Date;
  public readonly quantity: number | undefined;

  constructor(investment: IInvestment) {
    this.id = investment.id;
    this.price = investment.price;
    this.date = investment.date;
    this.assetId = investment.assetId;
    this.quantity = investment.quantity;
    this.type = investment.type;
  }

  getTotalAmount(): number {
    return (this.quantity || 1) * this.price;
  }

  getQuantity(): number {
    return this.quantity || 1;
  }
}
