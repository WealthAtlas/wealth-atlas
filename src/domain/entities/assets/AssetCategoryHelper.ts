import { AssetCategory } from './AssetCategory';
import { AssetPricingModel } from './AssetPricingModel';
import { CompoundingFrequency } from './CompoundingFrequency';

/**
 * Get suggested valuation model based on asset category
 */
export function getSuggestedPricingModel(category: AssetCategory): AssetPricingModel {
  switch (category) {
    case AssetCategory.FIXED_DEPOSITS:
    case AssetCategory.GOVERNMENT_BONDS:
    case AssetCategory.CORPORATE_BONDS:
    case AssetCategory.BONDS:
      return AssetPricingModel.FIXED_INCOME;

    case AssetCategory.INSURANCE_POLICIES:
      return AssetPricingModel.MATURITY_BASED;

    case AssetCategory.STOCKS:
    case AssetCategory.MUTUAL_FUNDS:
    case AssetCategory.CRYPTOCURRENCY:
    case AssetCategory.COMMODITIES:
    case AssetCategory.REAL_ESTATE:
    case AssetCategory.CASH_AND_CASH_EQUIVALENTS:
    case AssetCategory.OTHER:
    default:
      return AssetPricingModel.MARKET_BASED;
  }
}

/**
 * Get suggested compounding frequency based on asset category
 */
export function getSuggestedCompoundingFrequency(category: AssetCategory): CompoundingFrequency {
  switch (category) {
    case AssetCategory.FIXED_DEPOSITS:
      return CompoundingFrequency.QUARTERLY; // Most FDs compound quarterly

    case AssetCategory.GOVERNMENT_BONDS:
    case AssetCategory.CORPORATE_BONDS:
    case AssetCategory.BONDS:
      return CompoundingFrequency.SEMI_ANNUALLY; // Most bonds pay semi-annually

    default:
      return CompoundingFrequency.ANNUALLY;
  }
}

/**
 * Check if category typically supports interest rates
 */
export function supportsInterestRate(category: AssetCategory): boolean {
  return [
    AssetCategory.FIXED_DEPOSITS,
    AssetCategory.GOVERNMENT_BONDS,
    AssetCategory.CORPORATE_BONDS,
    AssetCategory.BONDS,
  ].includes(category);
}

/**
 * Check if category typically has maturity dates
 */
export function supportsMaturityDate(category: AssetCategory): boolean {
  return [
    AssetCategory.FIXED_DEPOSITS,
    AssetCategory.GOVERNMENT_BONDS,
    AssetCategory.CORPORATE_BONDS,
    AssetCategory.BONDS,
    AssetCategory.INSURANCE_POLICIES,
  ].includes(category);
}

/**
 * Check if category supports maturity amounts
 */
export function supportsMaturityAmount(category: AssetCategory): boolean {
  return [AssetCategory.INSURANCE_POLICIES].includes(category);
}
