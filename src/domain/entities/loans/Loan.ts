import { LoanPayment } from './LoanPayment';

export interface ILoan {
  id?: number;
  name: string;
  lenderName: string;
  principalAmount: number;
  currency: string;
  startDate: Date;
  description?: string;
}

export class Loan implements ILoan {
  constructor(
    public readonly id: number | undefined,
    public readonly name: string,
    public readonly lenderName: string,
    public readonly principalAmount: number,
    public readonly currency: string,
    public readonly startDate: Date,
    public readonly description?: string
  ) {
    this.validateLoan();
  }

  private validateLoan(): void {
    if (!this.name.trim()) {
      throw new Error('Loan name is required');
    }
    if (!this.lenderName.trim()) {
      throw new Error('Lender name is required');
    }
    if (this.principalAmount <= 0) {
      throw new Error('Principal amount must be greater than zero');
    }
    if (!this.currency.trim()) {
      throw new Error('Currency is required');
    }
  }

  // Business methods to compute loan metrics
  getTotalPaidAmount(payments: LoanPayment[]): number {
    return payments
      .filter(p => p.loanId === this.id && p.isPaid)
      .reduce((total, payment) => total + payment.amount, 0);
  }

  getTotalPlannedAmount(payments: LoanPayment[]): number {
    return payments
      .filter(p => p.loanId === this.id)
      .reduce((total, payment) => total + payment.amount, 0);
  }

  getRemainingBalance(payments: LoanPayment[]): number {
    const totalPlanned = this.getTotalPlannedAmount(payments);
    return Math.max(0, totalPlanned - this.getTotalPaidAmount(payments));
  }

  getTotalInterest(payments: LoanPayment[]): number {
    const totalPayments = this.getTotalPlannedAmount(payments);
    return totalPayments - this.principalAmount;
  }

  getTotalInterestPaid(payments: LoanPayment[]): number {
    const totalPaid = this.getTotalPaidAmount(payments);
    const paidInterest = totalPaid - this.principalAmount;
    return Math.max(0, paidInterest);
  }

  isFullyPaid(payments: LoanPayment[]): boolean {
    return this.getTotalPaidAmount(payments) >= this.principalAmount;
  }

  // Calculate effective interest rate using IRR (Internal Rate of Return)
  calculateEffectiveInterestRate(payments: LoanPayment[]): number | undefined {
    const loanPayments = payments.filter(p => p.loanId === this.id && p.isPaid);

    if (loanPayments.length === 0) {
      return undefined;
    }

    // For IRR calculation, we need cash flows: initial loan (negative) + payments (positive)
    const cashFlows: { date: Date; amount: number }[] = [
      { date: this.startDate, amount: -this.principalAmount },
    ];

    loanPayments.forEach(payment => {
      cashFlows.push({ date: payment.date, amount: payment.amount });
    });

    // Sort by date
    cashFlows.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Simple IRR approximation using Newton-Raphson method
    return this.calculateIRR(cashFlows);
  }

  private calculateIRR(cashFlows: { date: Date; amount: number }[]): number | undefined {
    if (cashFlows.length < 2) return undefined;

    // Initial guess for IRR (10% annually)
    let rate = 0.1;
    const maxIterations = 100;
    const tolerance = 0.0001;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let dnpv = 0;
      const baseDate = cashFlows[0].date;

      cashFlows.forEach(cf => {
        const daysDiff = Math.floor(
          (cf.date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        const yearsFraction = daysDiff / 365.25;
        const discountFactor = Math.pow(1 + rate, yearsFraction);

        npv += cf.amount / discountFactor;
        dnpv += (-yearsFraction * cf.amount) / Math.pow(1 + rate, yearsFraction + 1);
      });

      if (Math.abs(npv) < tolerance) {
        return rate * 100; // Return as percentage
      }

      if (Math.abs(dnpv) < tolerance) {
        break; // Derivative too small, stop iteration
      }

      rate = rate - npv / dnpv;

      // Keep rate within reasonable bounds
      if (rate < -0.5 || rate > 10) {
        return undefined;
      }
    }

    return undefined; // Convergence failed
  }
}
