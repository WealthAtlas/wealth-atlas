export enum CompoundingFrequency {
  ANNUALLY = 'ANNUALLY', // 1 time per year
  SEMI_ANNUALLY = 'SEMI_ANNUALLY', // 2 times per year
  QUARTERLY = 'QUARTERLY', // 4 times per year
  MONTHLY = 'MONTHLY', // 12 times per year
  DAILY = 'DAILY', // 365 times per year
}

export const COMPOUNDING_FREQUENCY_VALUES: Record<CompoundingFrequency, number> = {
  [CompoundingFrequency.ANNUALLY]: 1,
  [CompoundingFrequency.SEMI_ANNUALLY]: 2,
  [CompoundingFrequency.QUARTERLY]: 4,
  [CompoundingFrequency.MONTHLY]: 12,
  [CompoundingFrequency.DAILY]: 365,
};
