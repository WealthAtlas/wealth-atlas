import { Loan } from '../entities/Loan';
import { LoanPayment } from '../entities/LoanPayment';

export interface IRRAnalysis {
  annualizedRate: number | undefined;
  monthlyRate: number | undefined;
  effectiveAnnualRate: number | undefined;
  paymentPeriods: number;
  totalInterestAmount: number;
  isReliable: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  riskFactors: string[];
}

export interface CashFlow {
  date: Date;
  amount: number;
  type: 'LOAN_DISBURSEMENT' | 'PAYMENT' | 'SCHEDULED_PAYMENT';
  description: string;
}

export class IRRAnalysisService {
  /**
   * Calculate comprehensive IRR analysis for a loan
   */
  static calculateIRRAnalysis(loan: Loan, payments: LoanPayment[]): IRRAnalysis {
    const cashFlows = this.buildCashFlows(loan, payments);
    const annualizedRate = this.calculateIRR(cashFlows);

    const paidPayments = payments.filter(p => p.isPaid);
    const totalInterestAmount =
      paidPayments.reduce((sum, p) => sum + p.amount, 0) - loan.principalAmount;

    const analysis: IRRAnalysis = {
      annualizedRate,
      monthlyRate: annualizedRate ? annualizedRate / 12 : undefined,
      effectiveAnnualRate: this.calculateEffectiveAnnualRate(annualizedRate),
      paymentPeriods: paidPayments.length,
      totalInterestAmount: Math.max(0, totalInterestAmount),
      isReliable: this.assessReliability(cashFlows, paidPayments),
      riskLevel: this.assessRiskLevel(annualizedRate, paidPayments.length),
      riskFactors: this.identifyRiskFactors(loan, payments, annualizedRate),
    };

    return analysis;
  }

  /**
   * Build cash flow array for IRR calculation
   */
  private static buildCashFlows(loan: Loan, payments: LoanPayment[]): CashFlow[] {
    const cashFlows: CashFlow[] = [];

    // Initial loan disbursement (negative cash flow)
    cashFlows.push({
      date: loan.startDate,
      amount: -loan.principalAmount,
      type: 'LOAN_DISBURSEMENT',
      description: `Loan disbursement: ${loan.name}`,
    });

    // Add all paid payments (positive cash flows)
    payments
      .filter(p => p.isPaid)
      .forEach(payment => {
        cashFlows.push({
          date: payment.date,
          amount: payment.amount,
          type: 'PAYMENT',
          description: payment.description || 'Loan payment',
        });
      });

    // Sort by date
    cashFlows.sort((a, b) => a.date.getTime() - b.date.getTime());

    return cashFlows;
  }

  /**
   * Enhanced IRR calculation using Newton-Raphson method with improvements
   */
  private static calculateIRR(cashFlows: CashFlow[]): number | undefined {
    if (cashFlows.length < 2) return undefined;

    // Initial guess based on simple heuristics
    let rate = this.getInitialGuess(cashFlows);
    const maxIterations = 1000; // Increased iterations
    const tolerance = 0.000001; // Tighter tolerance

    for (let i = 0; i < maxIterations; i++) {
      const { npv, dnpv } = this.calculateNPVAndDerivative(cashFlows, rate);

      if (Math.abs(npv) < tolerance) {
        return rate * 100; // Return as percentage
      }

      if (Math.abs(dnpv) < tolerance) {
        break; // Derivative too small, stop iteration
      }

      const newRate = rate - npv / dnpv;

      // Ensure convergence and reasonable bounds
      if (Math.abs(newRate - rate) < tolerance) {
        return newRate * 100;
      }

      rate = newRate;

      // Keep rate within reasonable bounds (-50% to 1000%)
      if (rate < -0.5 || rate > 10) {
        return rate; // Return as percentage
      }
    }

    return undefined; // Convergence failed
  }

  /**
   * Calculate NPV and its derivative for Newton-Raphson method
   */
  private static calculateNPVAndDerivative(
    cashFlows: CashFlow[],
    rate: number
  ): { npv: number; dnpv: number } {
    let npv = 0;
    let dnpv = 0;
    const baseDate = cashFlows[0].date;

    cashFlows.forEach(cf => {
      const daysDiff = Math.floor((cf.date.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));
      const yearsFraction = daysDiff / 365.25;
      const discountFactor = Math.pow(1 + rate, yearsFraction);

      npv += cf.amount / discountFactor;
      dnpv += (-yearsFraction * cf.amount) / Math.pow(1 + rate, yearsFraction + 1);
    });

    return { npv, dnpv };
  }

  /**
   * Get better initial guess for IRR calculation
   */
  private static getInitialGuess(cashFlows: CashFlow[]): number {
    const totalOutflow = Math.abs(
      cashFlows.filter(cf => cf.amount < 0).reduce((sum, cf) => sum + cf.amount, 0)
    );
    const totalInflow = cashFlows
      .filter(cf => cf.amount > 0)
      .reduce((sum, cf) => sum + cf.amount, 0);

    if (totalOutflow === 0) return 0.1;

    const simpleReturn = (totalInflow - totalOutflow) / totalOutflow;
    const timeSpan = this.getTimeSpanInYears(cashFlows);

    if (timeSpan === 0) return 0.1;

    // Approximate annualized return
    return Math.max(0.01, Math.min(1.0, simpleReturn / timeSpan));
  }

  /**
   * Get time span of cash flows in years
   */
  private static getTimeSpanInYears(cashFlows: CashFlow[]): number {
    if (cashFlows.length < 2) return 0;

    const startDate = cashFlows[0].date;
    const endDate = cashFlows[cashFlows.length - 1].date;
    const daysDiff = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    return daysDiff / 365.25;
  }

  /**
   * Calculate effective annual rate (EAR) from nominal rate
   */
  private static calculateEffectiveAnnualRate(nominalRate: number | undefined): number | undefined {
    if (!nominalRate) return undefined;

    // Assuming monthly compounding for most loans
    const monthlyRate = nominalRate / 100 / 12;
    const ear = (Math.pow(1 + monthlyRate, 12) - 1) * 100;

    return ear;
  }

  /**
   * Assess reliability of IRR calculation
   */
  private static assessReliability(cashFlows: CashFlow[], paidPayments: LoanPayment[]): boolean {
    // Need at least 3 cash flows (disbursement + 2 payments)
    if (cashFlows.length < 3) return false;

    // Need payments spread over at least 2 months
    if (paidPayments.length < 2) return false;

    const timeSpan = this.getTimeSpanInYears(cashFlows);

    // Need at least 60 days of payment history
    return timeSpan >= 60 / 365.25;
  }

  /**
   * Assess risk level based on IRR and payment patterns
   */
  private static assessRiskLevel(
    rate: number | undefined,
    paymentCount: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (!rate) return 'HIGH';

    // High risk for very high rates or few payments
    if (rate > 36 || paymentCount < 3) return 'HIGH';

    // Medium risk for moderately high rates
    if (rate > 18) return 'MEDIUM';

    // Low risk for reasonable rates with good payment history
    return 'LOW';
  }

  /**
   * Identify specific risk factors
   */
  private static identifyRiskFactors(
    loan: Loan,
    payments: LoanPayment[],
    rate: number | undefined
  ): string[] {
    const factors: string[] = [];

    if (!rate) {
      factors.push('Insufficient payment data for reliable calculation');
      return factors;
    }

    if (rate > 50) {
      factors.push('Extremely high interest rate (>50%)');
    } else if (rate > 36) {
      factors.push('Very high interest rate (>36%)');
    } else if (rate > 24) {
      factors.push('High interest rate (>24%)');
    }

    const paidPayments = payments.filter(p => p.isPaid);
    if (paidPayments.length < 3) {
      factors.push('Limited payment history');
    }

    const overduePayments = payments.filter(p => !p.isPaid && new Date() > p.date);
    if (overduePayments.length > 0) {
      factors.push(`${overduePayments.length} overdue payment(s)`);
    }

    const totalPaid = paidPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalInterest = totalPaid - loan.principalAmount;
    const interestRatio = totalInterest / loan.principalAmount;

    if (interestRatio > 0.5) {
      factors.push('High total interest burden');
    }

    return factors;
  }

  /**
   * Format IRR for display with appropriate precision and context
   */
  static formatIRR(analysis: IRRAnalysis): {
    primary: string;
    secondary: string;
    tooltip: string;
  } {
    if (!analysis.annualizedRate) {
      // More specific messaging based on payment count
      if (analysis.paymentPeriods === 0) {
        return {
          primary: 'Pending',
          secondary: 'No payments yet',
          tooltip: 'Interest rate will be calculated once payments are made and marked as paid',
        };
      } else {
        return {
          primary: 'N/A',
          secondary: 'Insufficient data',
          tooltip: 'Not enough payment history to calculate reliable interest rate',
        };
      }
    }

    const rate = analysis.annualizedRate;
    let primary: string;
    let riskIndicator = '';

    if (analysis.riskLevel === 'HIGH') {
      riskIndicator = ' ⚠️';
    } else if (analysis.riskLevel === 'MEDIUM') {
      riskIndicator = ' ⚡';
    }

    if (rate < 0.01) {
      primary = '~0%';
    } else if (rate < 1) {
      primary = `${rate.toFixed(2)}%`;
    } else {
      primary = `${rate.toFixed(1)}%`;
    }

    primary += riskIndicator;

    const secondary = analysis.isReliable ? `${analysis.paymentPeriods} payments` : 'Preliminary';

    const tooltip = this.buildTooltip(analysis);

    return { primary, secondary, tooltip };
  }

  /**
   * Build detailed tooltip for IRR display
   */
  private static buildTooltip(analysis: IRRAnalysis): string {
    const parts: string[] = [];

    if (analysis.annualizedRate) {
      parts.push(`Annual Rate: ${analysis.annualizedRate.toFixed(2)}%`);

      if (analysis.monthlyRate) {
        parts.push(`Monthly Rate: ${analysis.monthlyRate.toFixed(3)}%`);
      }

      if (analysis.effectiveAnnualRate) {
        parts.push(`Effective Annual Rate: ${analysis.effectiveAnnualRate.toFixed(2)}%`);
      }
    }

    parts.push(`Payment Periods: ${analysis.paymentPeriods}`);
    parts.push(`Total Interest: $${analysis.totalInterestAmount.toLocaleString()}`);
    parts.push(`Reliability: ${analysis.isReliable ? 'High' : 'Low'}`);
    parts.push(`Risk Level: ${analysis.riskLevel}`);

    if (analysis.riskFactors.length > 0) {
      parts.push('Risk Factors:');
      analysis.riskFactors.forEach(factor => {
        parts.push(`• ${factor}`);
      });
    }

    return parts.join('\n');
  }
}
