import { AssetCategory } from './AssetCategory';
import { AssetTransaction } from './AssetTransaction';
import { AssetValuationConfig } from './AssetValuationConfig';

export interface IAsset {
  id?: number;
  name: string;
  description: string;
  category: AssetCategory;
  currency: string;
  currentMarketValue: number | undefined;
  valueUpdatedAt: Date | undefined;
  valuationConfig?: AssetValuationConfig; // Optional valuation configuration for enhanced valuation
}

export class Asset implements IAsset {
  constructor(
    public readonly id: number | undefined,
    public readonly name: string,
    public readonly description: string,
    public readonly category: AssetCategory,
    public readonly currency: string,
    public readonly currentMarketValue: number | undefined,
    public readonly valueUpdatedAt: Date | undefined,
    public readonly valuationConfig?: AssetValuationConfig
  ) {}

  // Business methods to compute portfolio metrics
  getTotalInvestedAmount(transactions: AssetTransaction[]): number {
    return transactions
      .filter(t => t.assetId === this.id)
      .reduce((total, transaction) => {
        const amount = (transaction.quantity || 1) * transaction.price;
        return transaction.transactionType === 'buy' ? total + amount : total - amount;
      }, 0);
  }

  getCurrentHoldings(transactions: AssetTransaction[]): number {
    return transactions
      .filter(t => t.assetId === this.id)
      .reduce((total, transaction) => {
        const quantity = transaction.quantity || 1;
        return transaction.transactionType === 'buy' ? total + quantity : total - quantity;
      }, 0);
  }

  getProfitLoss(transactions: AssetTransaction[]): number | undefined {
    if (!this.currentMarketValue) return undefined;

    const totalInvested = this.getTotalInvestedAmount(transactions);
    const currentHoldings = this.getCurrentHoldings(transactions);
    const currentTotalValue = currentHoldings * this.currentMarketValue;

    return currentTotalValue - totalInvested;
  }
}
