import { AssetPricingModel } from './AssetPricingModel';
import { CompoundingFrequency } from './CompoundingFrequency';

export interface AssetValuationConfig {
  pricingModel: AssetPricingModel;

  // Fixed Income specifics (FDs, Bonds)
  interestRate?: number; // Annual interest rate as percentage (e.g., 7.5 for 7.5%)
  compoundingFrequency?: CompoundingFrequency;
  maturityDate?: Date; // Optional maturity date

  // Maturity-based specifics (Insurance Policies, Endowment Plans)
  maturityAmount?: number; // Fixed amount at maturity

  // Market-based specifics (Stocks, Mutual Funds, REITs)
  apiPath?: string; // API path to fetch current market value per unit
}
