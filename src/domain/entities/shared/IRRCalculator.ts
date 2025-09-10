export interface Transaction {
  date: Date;
  amount: number;
}

export class IRRCalculator {
  private static _instance: IRRCalculator = new IRRCalculator();

  private constructor() {}

  static getInstance(): IRRCalculator {
    return IRRCalculator._instance;
  }

  public calculateIRR({
    transactions,
    value,
    valueUpdatedOn,
  }: {
    transactions: Transaction[];
    value: number;
    valueUpdatedOn: Date;
  }): number {
    if (!transactions.length) return 0.0;
    if (value === 0) return 0.0;

    transactions = [...transactions].sort((a, b) => a.date.getTime() - b.date.getTime());

    const totalPayment = this.calculateTotalPayment(transactions);
    const totalYears = this.calculateTotalYears(transactions, valueUpdatedOn);

    if (totalPayment === 0) return 0.0;
    if (value - totalPayment === 0) return 0.0;

    let irrGuess = this.calculateInitialIRR(value, totalPayment, totalYears);

    const maxIterations = 1000;
    const precision = 0.0001;

    for (let i = 0; i < maxIterations; i++) {
      const valueOnIrr = this.calculateFutureValueOnIRR(transactions, irrGuess, valueUpdatedOn);
      const diff = (value - valueOnIrr) / value;

      if (Math.abs(diff) < precision) {
        break;
      }

      irrGuess += this.calculateScale(diff) * diff;
    }

    if (isNaN(irrGuess)) {
      return 0.0;
    } else if (!isFinite(irrGuess)) {
      return 0.0;
    } else if (irrGuess > 100) {
      return 100.0;
    } else if (irrGuess < -100) {
      return -100.0;
    }
    return irrGuess;
  }

  public calculateFutureValueOnIRR(payments: Transaction[], irr: number, futureDate: Date): number {
    let futureValue = 0;
    for (const payment of payments) {
      const years = (payment.date.getTime() - futureDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
      if (years === 0) {
        futureValue += payment.amount;
      } else if (years < 1 && years > 0) {
        futureValue += payment.amount / Math.pow(1 + irr / 100, 1);
      } else if (years > -1 && years < 0) {
        futureValue += payment.amount / Math.pow(1 + irr / 100, -1);
      } else {
        futureValue += payment.amount / Math.pow(1 + irr / 100, years);
      }
    }
    if (isNaN(futureValue)) return 0.0;
    if (!isFinite(futureValue)) return 0.0;
    return futureValue;
  }

  public calculateValueOnIRR(
    irr: number,
    futureDate: Date,
    currentValue: number,
    currentValueUpdatedOn: Date
  ): number {
    const years =
      (currentValueUpdatedOn.getTime() - futureDate.getTime()) / (1000 * 60 * 60 * 24 * 365);
    if (years === 0) {
      return currentValue;
    } else if (years < 1 && years > 0) {
      return currentValue / Math.pow(1 + irr / 100, 1);
    } else if (years > -1 && years < 0) {
      return currentValue / Math.pow(1 + irr / 100, -1);
    } else {
      return currentValue / Math.pow(1 + irr / 100, years);
    }
  }

  private calculateInitialIRR(value: number, totalPayment: number, totalYears: number): number {
    const baseIRR = ((value - totalPayment) / totalPayment) * 100;
    return totalYears < 1 ? baseIRR : baseIRR / totalYears;
  }

  private calculateTotalPayment(transactions: Transaction[]): number {
    return transactions.reduce((sum, p) => sum + p.amount, 0);
  }

  private calculateTotalYears(transactions: Transaction[], valueUpdatedOn: Date): number {
    if (!transactions.length) return 0;
    const firstDate = transactions[0].date;
    const diffMs = valueUpdatedOn.getTime() - firstDate.getTime();
    return diffMs / (1000 * 60 * 60 * 24 * 365);
  }

  private calculateScale(diff: number): number {
    const absDiff = Math.abs(diff);
    if (absDiff > 0.05) {
      return 20.0;
    } else if (absDiff > 0.01) {
      return 10.0;
    } else if (absDiff > 0.001) {
      return 5.0;
    } else {
      return 2.0;
    }
  }
}
