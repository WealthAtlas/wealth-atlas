export enum InvestmentFrequency {
  DAILY = 'DAILY',
  BIWEEKLY = 'BIWEEKLY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  SEMI_ANNUALLY = 'SEMI_ANNUALLY',
  ANNUALLY = 'ANNUALLY',
}

export const INVESTMENT_FREQUENCY_LABELS: Record<InvestmentFrequency, string> = {
  [InvestmentFrequency.DAILY]: 'Daily',
  [InvestmentFrequency.BIWEEKLY]: 'Bi-Weekly',
  [InvestmentFrequency.WEEKLY]: 'Weekly',
  [InvestmentFrequency.MONTHLY]: 'Monthly',
  [InvestmentFrequency.QUARTERLY]: 'Quarterly',
  [InvestmentFrequency.SEMI_ANNUALLY]: 'Semi-Annually',
  [InvestmentFrequency.ANNUALLY]: 'Annually',
};
