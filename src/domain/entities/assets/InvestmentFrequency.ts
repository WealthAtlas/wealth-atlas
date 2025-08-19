export enum InvestmentFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUALLY = 'SEMI_ANNUALLY',
  ANNUALLY = 'ANNUALLY',
}

export const INVESTMENT_FREQUENCY_MONTHS: Record<InvestmentFrequency, number> = {
  [InvestmentFrequency.MONTHLY]: 1,
  [InvestmentFrequency.QUARTERLY]: 3,
  [InvestmentFrequency.SEMI_ANNUALLY]: 6,
  [InvestmentFrequency.ANNUALLY]: 12,
};

export const INVESTMENT_FREQUENCY_LABELS: Record<InvestmentFrequency, string> = {
  [InvestmentFrequency.MONTHLY]: 'Monthly',
  [InvestmentFrequency.QUARTERLY]: 'Quarterly',
  [InvestmentFrequency.SEMI_ANNUALLY]: 'Semi-Annually',
  [InvestmentFrequency.ANNUALLY]: 'Annually',
};
