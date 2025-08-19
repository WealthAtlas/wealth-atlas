/**
 * Goal entity representing a financial objective with inflation-adjusted targeting
 *
 * Goals are financial targets with specific amounts, maturity dates, and inflation rates.
 * They support multi-asset allocation and provide inflation-adjusted target calculations.
 */
export interface IGoal {
  id?: number;
  name: string;
  targetAmount: number;
  maturityDate: Date;
  inflationRate: number; // as decimal (0.06 for 6%)
  currency: string; // using Currency enum values
  createdAt: Date;
}

export class Goal implements IGoal {
  id?: number;
  name: string;
  targetAmount: number;
  maturityDate: Date;
  inflationRate: number;
  currency: string;
  createdAt: Date;

  constructor(
    name: string,
    targetAmount: number,
    maturityDate: Date,
    inflationRate: number,
    currency: string,
    createdAt: Date = new Date(),
    id?: number
  ) {
    this.validateInputs(name, targetAmount, inflationRate);

    this.id = id;
    this.name = name.trim();
    this.targetAmount = targetAmount;
    this.maturityDate = maturityDate;
    this.inflationRate = inflationRate;
    this.currency = currency;
    this.createdAt = createdAt;
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

  /**
   * Check if the goal has reached its maturity date
   */
  isMatured(): boolean {
    return new Date() >= this.maturityDate;
  }

  /**
   * Get the goal's status based on maturity
   */
  getStatus(): 'Active' | 'Matured' {
    return this.isMatured() ? 'Matured' : 'Active';
  }

  private validateInputs(name: string, targetAmount: number, inflationRate: number): void {
    if (!name || name.trim().length === 0) {
      throw new Error('Goal name cannot be empty');
    }

    if (targetAmount <= 0) {
      throw new Error('Target amount must be greater than zero');
    }

    if (inflationRate < 0 || inflationRate > 1) {
      throw new Error('Inflation rate must be between 0 and 1 (0% to 100%)');
    }
  }
}
