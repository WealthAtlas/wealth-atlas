export enum AssetPricingModel {
  MARKET_BASED = 'MARKET_BASED', // Stocks, Mutual Funds, REITs - current market value
  FIXED_INCOME = 'FIXED_INCOME', // Fixed Deposits, Bonds - calculated from interest
  MATURITY_BASED = 'MATURITY_BASED', // Insurance Policies, Endowment Plans - fixed maturity amount
}
