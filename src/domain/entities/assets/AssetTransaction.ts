export interface IAssetTransaction {
  id: number | undefined;
  assetId: number;
  quantity: number | undefined;
  price: number; // Unit price (includes fees)
  date: Date;
}

export class AssetTransaction implements IAssetTransaction {
  public readonly id: number | undefined;
  public readonly assetId: number;
  public readonly price: number;
  public readonly date: Date;
  public readonly quantity: number | undefined;

  constructor({ id, assetId, price, date, quantity }: IAssetTransaction) {
    this.id = id;
    this.price = price;
    this.date = date;
    this.assetId = assetId;
    this.quantity = quantity;
  }

  // Get total amount for this transaction
  getTotalAmount(): number {
    return (this.quantity || 1) * this.price;
  }

  getQuantity(): number {
    return this.quantity || 1;
  }
}
