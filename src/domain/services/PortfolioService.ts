import { Asset } from '../entities/assets/Asset';
import { AssetTransaction } from '../entities/assets/AssetTransaction';
import { AssetValuationService } from './AssetValuationService';

export class PortfolioService {
  /**
   * Calculate portfolio summary for an asset
   */
  getAssetSummary(
    asset: Asset,
    transactions: AssetTransaction[]
  ): {
    totalInvested: number;
    currentHoldings: number;
    currentValue: number | undefined;
    calculatedValue: number | undefined;
    profitLoss: number | undefined;
    profitLossPercentage: number | undefined;
    growthRate: number | undefined;
    isCalculated: boolean;
  } {
    const totalInvested = asset.getTotalInvestedAmount(transactions);
    const currentHoldings = asset.getCurrentHoldings(transactions);

    // Use new valuation service for enhanced calculations
    const valuationResult = AssetValuationService.calculateCurrentValue(asset, transactions);

    const currentValue = valuationResult.currentValue;
    const profitLoss = currentValue !== undefined ? currentValue - totalInvested : undefined;

    const profitLossPercentage =
      profitLoss !== undefined && totalInvested > 0
        ? (profitLoss / totalInvested) * 100
        : undefined;

    return {
      totalInvested,
      currentHoldings,
      currentValue,
      calculatedValue: valuationResult.calculatedValue,
      profitLoss,
      profitLossPercentage,
      growthRate: valuationResult.growthRate,
      isCalculated: valuationResult.isCalculated,
    };
  }

  /**
   * Calculate total portfolio value across all assets
   */
  getTotalPortfolioValue(
    assets: Asset[],
    allTransactions: AssetTransaction[]
  ): {
    totalInvested: number;
    totalCurrentValue: number;
    totalProfitLoss: number;
    totalProfitLossPercentage: number;
  } {
    let totalInvested = 0;
    let totalCurrentValue = 0;
    let totalProfitLoss = 0;

    assets.forEach(asset => {
      const assetTransactions = allTransactions.filter(t => t.assetId === asset.id);
      const summary = this.getAssetSummary(asset, assetTransactions);

      totalInvested += summary.totalInvested;
      totalCurrentValue += summary.currentValue || 0;
      totalProfitLoss += summary.profitLoss || 0;
    });

    const totalProfitLossPercentage =
      totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0;

    return {
      totalInvested,
      totalCurrentValue,
      totalProfitLoss,
      totalProfitLossPercentage,
    };
  }
}
