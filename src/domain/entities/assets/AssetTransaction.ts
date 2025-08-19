export interface IAssetTransaction {
  id?: number;
  assetId: number | undefined;
  transactionType: 'buy' | 'sell';
  quantity: number | undefined; // Optional for assets like FDs where quantity doesn't apply
  price: number; // Unit price (includes fees)
  date: Date;
}

export class AssetTransaction implements IAssetTransaction {
  constructor(
    public readonly id: number | undefined,
    public readonly assetId: number | undefined,
    public readonly transactionType: 'buy' | 'sell',
    public readonly quantity: number | undefined,
    public readonly price: number,
    public readonly date: Date
  ) {}

  // Get total amount for this transaction
  getTotalAmount(): number {
    return (this.quantity || 1) * this.price;
  }

  // Check if this is a quantity-based asset (has meaningful quantity)
  isQuantityBased(): boolean {
    return this.quantity !== undefined && this.quantity !== null;
  }
}
