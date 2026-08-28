import { Currency } from '../shared/Currency';
import { Allocation } from './Allocation';
import { utcDay } from '../../utils/DateUtils';

/**
 * Goal entity representing a financial objective with inflation-adjusted targeting
 *
 * Goals are financial targets with specific amounts, maturity dates, and inflation rates.
 * They support multi-asset allocation and provide inflation-adjusted target calculations.
 */
export interface IGoal {
  id: number | undefined;
  name: string;
  targetAmount: number;
  maturityDate: Date;
  inflationRate: number;
  currency: Currency;
  createdAt: Date; // Added createdAt property
}

export class Goal implements IGoal {
  id: number | undefined;
  name: string;
  targetAmount: number;
  maturityDate: Date;
  inflationRate: number;
  currency: Currency;
  allocations: Allocation[];
  createdAt: Date;

  constructor({
    id,
    name,
    targetAmount,
    maturityDate,
    inflationRate,
    currency,
    assetAllocations,
    createdAt,
  }: IGoal & { assetAllocations: Allocation[]; createdAt: Date }) {
    this.id = id;
    this.name = name.trim();
    this.targetAmount = targetAmount;
    this.maturityDate = utcDay(maturityDate);
    this.inflationRate = inflationRate;
    this.currency = currency;
    this.allocations = assetAllocations;
    this.createdAt = new Date(createdAt);
  }

  /**
   * Calculate the inflation-adjusted target amount based on years to maturity
   */
  getInflationAdjustedTarget(): number {
    const yearsToMaturity = this.getYearsToMaturity();
    if (yearsToMaturity <= 0) {
      return this.targetAmount;
    }

    return this.targetAmount * Math.pow(1 + this.inflationRate, yearsToMaturity);
  }

  /**
   * Calculate years from current date to maturity date
   */
  getYearsToMaturity(): number {
    const currentDate = new Date();
    const timeDifference = this.maturityDate.getTime() - currentDate.getTime();
    return Math.max(0, timeDifference / (1000 * 60 * 60 * 24 * 365.25));
  }
}
