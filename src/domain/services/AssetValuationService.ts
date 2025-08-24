import { Asset } from '../entities/assets/Asset';
import { AssetPricingModel } from '../entities/assets/AssetPricingModel';
import { AssetTransaction } from '../entities/assets/AssetTransaction';
import {
  COMPOUNDING_FREQUENCY_VALUES,
  CompoundingFrequency,
} from '../entities/assets/CompoundingFrequency';
import { ScheduledAssetTransaction } from '../entities/assets/ScheduledAssetTransaction';

export interface AssetValuationResult {
  currentValue: number | undefined;
  calculatedValue: number | undefined; // Value calculated from valuation model
  growthRate: number | undefined; // Annualized growth rate (IRR)
  projectedGrowthRate: number | undefined; // IRR including future scheduled transactions
  isCalculated: boolean; // Whether value is calculated vs manual
}

export interface EnhancedAssetValuationOptions {
  includeScheduledTransactions?: boolean;
  projectionYears?: number;
  assumedFinalValue?: number; // For projection scenarios
}

export class AssetValuationService {
  /**
   * Calculate current value based on asset valuation model
   */
  static calculateCurrentValue(
    asset: Asset,
    transactions: AssetTransaction[]
  ): AssetValuationResult {
    return this.calculateEnhancedCurrentValue(asset, transactions, []);
  }

  /**
   * Calculate enhanced current value including scheduled transactions for IRR projection
   */
  static calculateEnhancedCurrentValue(
    asset: Asset,
    transactions: AssetTransaction[],
    scheduledTransactions: ScheduledAssetTransaction[],
    options: EnhancedAssetValuationOptions = {}
  ): AssetValuationResult {
    if (!asset.valuationConfig) {
      // Fallback to existing manual market value
      const currentGrowthRate = this.calculateMarketBasedGrowthRate(asset, transactions);
      const projectedGrowthRate = options.includeScheduledTransactions
        ? this.calculateProjectedGrowthRate(asset, transactions, scheduledTransactions, options)
        : currentGrowthRate;

      return {
        currentValue: asset.currentMarketValue,
        calculatedValue: undefined,
        growthRate: currentGrowthRate,
        projectedGrowthRate,
        isCalculated: false,
      };
    }

    switch (asset.valuationConfig.pricingModel) {
      case AssetPricingModel.FIXED_INCOME:
        return this.calculateFixedIncomeValue(asset, transactions);

      case AssetPricingModel.MATURITY_BASED:
        return this.calculateMaturityBasedValue(asset, transactions);

      case AssetPricingModel.MARKET_BASED:
      default: {
        const currentGrowthRate = this.calculateMarketBasedGrowthRate(asset, transactions);
        const projectedGrowthRate = options.includeScheduledTransactions
          ? this.calculateProjectedGrowthRate(asset, transactions, scheduledTransactions, options)
          : currentGrowthRate;

        return {
          currentValue: asset.currentMarketValue,
          calculatedValue: undefined,
          growthRate: currentGrowthRate,
          projectedGrowthRate,
          isCalculated: false,
        };
      }
    }
  }

  /**
   * Calculate value for fixed income assets (FDs, Bonds)
   */
  private static calculateFixedIncomeValue(
    asset: Asset,
    transactions: AssetTransaction[]
  ): AssetValuationResult {
    const config = asset.valuationConfig!;
    if (!config.interestRate) {
      return {
        currentValue: asset.currentMarketValue,
        calculatedValue: undefined,
        growthRate: undefined,
        isCalculated: false,
        projectedGrowthRate: undefined,
      };
    }

    const totalInvested = asset.getTotalInvestedAmount(transactions);
    if (totalInvested <= 0) {
      return {
        currentValue: 0,
        calculatedValue: 0,
        growthRate: config.interestRate,
        isCalculated: true,
        projectedGrowthRate: undefined,
      };
    }

    // Find the earliest investment date
    const investmentTransactions = transactions.filter(
      t => t.assetId === asset.id && t.transactionType === 'buy'
    );
    if (investmentTransactions.length === 0) {
      return {
        currentValue: 0,
        calculatedValue: 0,
        growthRate: config.interestRate,
        isCalculated: true,
        projectedGrowthRate: undefined,
      };
    }

    const earliestDate = new Date(Math.min(...investmentTransactions.map(t => t.date.getTime())));
    const currentDate = new Date();

    // Check if maturity date has passed
    if (config.maturityDate && currentDate > config.maturityDate) {
      // After maturity, no more interest accrual
      const maturityValue = this.calculateCompoundInterest(
        totalInvested,
        config.interestRate,
        config.compoundingFrequency,
        earliestDate,
        config.maturityDate
      );

      return {
        currentValue: maturityValue,
        calculatedValue: maturityValue,
        growthRate: config.interestRate,
        isCalculated: true,
        projectedGrowthRate: undefined,
      };
    }

    // Calculate current value with compound interest
    const endDate =
      config.maturityDate && config.maturityDate < currentDate ? config.maturityDate : currentDate;
    const calculatedValue = this.calculateCompoundInterest(
      totalInvested,
      config.interestRate,
      config.compoundingFrequency,
      earliestDate,
      endDate
    );

    return {
      currentValue: calculatedValue,
      calculatedValue,
      growthRate: config.interestRate,
      isCalculated: true,
      projectedGrowthRate: undefined,
    };
  }

  /**
   * Calculate value for maturity-based assets (Insurance Policies)
   */
  private static calculateMaturityBasedValue(
    asset: Asset,
    transactions: AssetTransaction[]
  ): AssetValuationResult {
    const config = asset.valuationConfig!;
    if (!config.maturityAmount || !config.maturityDate) {
      return {
        currentValue: asset.currentMarketValue,
        calculatedValue: undefined,
        growthRate: undefined,
        isCalculated: false,
        projectedGrowthRate: undefined,
      };
    }

    const totalInvested = asset.getTotalInvestedAmount(transactions);
    if (totalInvested <= 0) {
      return {
        currentValue: 0,
        calculatedValue: 0,
        growthRate: undefined,
        isCalculated: true,
        projectedGrowthRate: undefined,
      };
    }

    // Find the earliest investment date
    const investmentTransactions = transactions.filter(
      t => t.assetId === asset.id && t.transactionType === 'buy'
    );
    if (investmentTransactions.length === 0) {
      return {
        currentValue: 0,
        calculatedValue: 0,
        growthRate: undefined,
        isCalculated: true,
        projectedGrowthRate: undefined,
      };
    }

    const earliestDate = new Date(Math.min(...investmentTransactions.map(t => t.date.getTime())));
    const currentDate = new Date();
    const maturityDate = config.maturityDate;

    // If maturity date has passed, return maturity amount
    if (currentDate >= maturityDate) {
      const growthRate = this.calculateAnnualizedGrowthRate(
        totalInvested,
        config.maturityAmount,
        earliestDate,
        maturityDate
      );
      return {
        currentValue: config.maturityAmount,
        calculatedValue: config.maturityAmount,
        growthRate,
        isCalculated: true,
        projectedGrowthRate: undefined,
      };
    }

    // Calculate pro-rated value based on time elapsed
    const totalDays = (maturityDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24);
    const elapsedDays = (currentDate.getTime() - earliestDate.getTime()) / (1000 * 60 * 60 * 24);
    const progressRatio = Math.max(0, Math.min(1, elapsedDays / totalDays));

    // Linear interpolation between invested amount and maturity amount
    const calculatedValue = totalInvested + (config.maturityAmount - totalInvested) * progressRatio;
    const growthRate = this.calculateAnnualizedGrowthRate(
      totalInvested,
      config.maturityAmount,
      earliestDate,
      maturityDate
    );

    return {
      currentValue: calculatedValue,
      calculatedValue,
      growthRate,
      isCalculated: true,
      projectedGrowthRate: undefined,
    };
  }

  /**
   * Calculate IRR-based growth rate for market-based assets
   */
  private static calculateMarketBasedGrowthRate(
    asset: Asset,
    transactions: AssetTransaction[]
  ): number | undefined {
    if (!asset.currentMarketValue) return undefined;

    const assetTransactions = transactions.filter(t => t.assetId === asset.id);
    if (assetTransactions.length === 0) return undefined;

    const currentHoldings = asset.getCurrentHoldings(assetTransactions);
    const currentTotalValue = currentHoldings * asset.currentMarketValue;

    // Build cash flows for IRR calculation
    const cashFlows = assetTransactions.map(t => ({
      date: t.date,
      amount: t.transactionType === 'buy' ? -t.getTotalAmount() : t.getTotalAmount(),
    }));

    // Add current value as final cash flow
    cashFlows.push({
      date: new Date(),
      amount: currentTotalValue,
    });

    return this.calculateIRR(cashFlows);
  }

  /**
   * Calculate compound interest
   */
  private static calculateCompoundInterest(
    principal: number,
    annualRate: number,
    compoundingFrequency: CompoundingFrequency = CompoundingFrequency.ANNUALLY,
    startDate: Date,
    endDate: Date
  ): number {
    const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const rate = annualRate / 100; // Convert percentage to decimal
    const n = COMPOUNDING_FREQUENCY_VALUES[compoundingFrequency];

    return principal * Math.pow(1 + rate / n, n * years);
  }

  /**
   * Calculate annualized growth rate
   */
  private static calculateAnnualizedGrowthRate(
    initialValue: number,
    finalValue: number,
    startDate: Date,
    endDate: Date
  ): number {
    const years = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    if (years <= 0 || initialValue <= 0) return 0;

    return (Math.pow(finalValue / initialValue, 1 / years) - 1) * 100;
  }

  /**
   * Calculate IRR using Newton-Raphson method (simplified version)
   */
  private static calculateIRR(cashFlows: { date: Date; amount: number }[]): number | undefined {
    if (cashFlows.length < 2) return undefined;

    // Sort cash flows by date
    const sortedFlows = [...cashFlows].sort((a, b) => a.date.getTime() - b.date.getTime());
    const baseDate = sortedFlows[0].date;

    // Convert to periods (in years from base date)
    const flows = sortedFlows.map(cf => ({
      period: (cf.date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25),
      amount: cf.amount,
    }));

    // Newton-Raphson iteration
    let rate = 0.1; // Initial guess: 10%
    const maxIterations = 100;
    const tolerance = 1e-6;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let dnpv = 0;

      for (const flow of flows) {
        const discountFactor = Math.pow(1 + rate, -flow.period);
        npv += flow.amount * discountFactor;
        dnpv -= (flow.amount * flow.period * discountFactor) / (1 + rate);
      }

      if (Math.abs(npv) < tolerance) {
        return rate * 100; // Convert to percentage
      }

      if (Math.abs(dnpv) < tolerance) {
        break; // Avoid division by zero
      }

      rate = rate - npv / dnpv;

      // Ensure rate stays reasonable
      if (rate < -0.99 || rate > 10) {
        break;
      }
    }

    return undefined; // Failed to converge
  }

  /**
   * Calculate projected growth rate including future scheduled transactions
   */
  private static calculateProjectedGrowthRate(
    asset: Asset,
    transactions: AssetTransaction[],
    scheduledTransactions: ScheduledAssetTransaction[],
    options: EnhancedAssetValuationOptions
  ): number | undefined {
    const projectionYears = options.projectionYears || 2;
    const projectionEndDate = new Date();
    projectionEndDate.setFullYear(projectionEndDate.getFullYear() + projectionYears);

    // Build combined cash flows from actual and scheduled transactions
    const cashFlows: { date: Date; amount: number }[] = [];

    // Add historical transactions
    transactions
      .filter(t => t.assetId === asset.id)
      .forEach(t => {
        cashFlows.push({
          date: t.date,
          amount: t.transactionType === 'buy' ? -t.getTotalAmount() : t.getTotalAmount(),
        });
      });

    // Add future scheduled transactions within projection period
    scheduledTransactions
      .filter(
        st =>
          st.assetId === asset.id &&
          st.isActive &&
          !st.isExecuted &&
          st.scheduledDate <= projectionEndDate
      )
      .forEach(st => {
        cashFlows.push({
          date: st.scheduledDate,
          amount: st.transactionType === 'buy' ? -st.getTotalAmount() : st.getTotalAmount(),
        });
      });

    if (cashFlows.length === 0) return undefined;

    // Calculate projected final value
    const totalInvested = cashFlows
      .filter(cf => cf.amount < 0)
      .reduce((sum, cf) => sum + Math.abs(cf.amount), 0);

    const projectedFinalValue = options.assumedFinalValue || totalInvested * 1.1; // 10% default assumption

    // Add final value as the last cash flow
    cashFlows.push({
      date: projectionEndDate,
      amount: projectedFinalValue,
    });

    return this.calculateIRR(cashFlows);
  }
}
