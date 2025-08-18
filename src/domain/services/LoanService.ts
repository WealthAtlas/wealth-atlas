import { LoanPaymentRepository } from '../../data/repositories/LoanPaymentRepository';
import { LoanRepository } from '../../data/repositories/LoanRepository';
import { PaymentScheduleRepository } from '../../data/repositories/PaymentScheduleRepository';
import { Loan } from '../entities/Loan';
import { LoanPayment } from '../entities/LoanPayment';
import { PaymentSchedule } from '../entities/PaymentSchedule';
import { IRRAnalysis, IRRAnalysisService } from './IRRAnalysisService';

export class LoanService {
  constructor(
    private loanRepository: LoanRepository,
    private paymentScheduleRepository: PaymentScheduleRepository,
    private loanPaymentRepository: LoanPaymentRepository
  ) {}

  // Auto-convert scheduled payments to actual payments (main method for app initialization)
  async autoConvertScheduledPayments(): Promise<void> {
    const schedules = await this.paymentScheduleRepository.findActiveSchedules();
    const today = new Date();

    for (const schedule of schedules) {
      const newPayments = await this.generatePaymentsForSchedule(schedule, today);

      if (newPayments.length > 0) {
        // Save new payments
        await this.loanPaymentRepository.saveMultiple(newPayments);

        // Update the schedule's last generated date
        const updatedSchedule = schedule.updateLastGeneratedDate(today);
        await this.paymentScheduleRepository.save(updatedSchedule);
      }
    }
  }

  // Generate payments for a specific schedule up to a given date
  private async generatePaymentsForSchedule(
    schedule: PaymentSchedule,
    upToDate: Date
  ): Promise<LoanPayment[]> {
    // Get the starting point for generation
    const fromDate = schedule.lastGeneratedDate
      ? new Date(schedule.lastGeneratedDate.getTime() + 24 * 60 * 60 * 1000) // Next day after last generated
      : schedule.startDate;

    // Don't generate payments beyond the schedule's end date
    const endDate = upToDate > schedule.endDate ? schedule.endDate : upToDate;

    if (fromDate > endDate) {
      return []; // No payments to generate
    }

    // Generate payments between the date range
    return schedule.generatePaymentsBetween(fromDate, endDate);
  }

  // Auto-convert after creating or editing a schedule
  async autoConvertAfterScheduleChange(scheduleId: number): Promise<void> {
    const schedule = await this.paymentScheduleRepository.findById(scheduleId);
    if (!schedule) return;

    const today = new Date();
    const newPayments = await this.generatePaymentsForSchedule(schedule, today);

    if (newPayments.length > 0) {
      await this.loanPaymentRepository.saveMultiple(newPayments);

      const updatedSchedule = schedule.updateLastGeneratedDate(today);
      await this.paymentScheduleRepository.save(updatedSchedule);
    }
  }

  // Get loan summary with calculated metrics
  async getLoanSummary(loanId: number): Promise<LoanSummary | null> {
    const loan = await this.loanRepository.findById(loanId);
    if (!loan) return null;

    const payments = await this.loanPaymentRepository.findByLoanId(loanId);
    const schedules = await this.paymentScheduleRepository.findByLoanId(loanId);

    // Calculate enhanced IRR analysis
    const irrAnalysis = IRRAnalysisService.calculateIRRAnalysis(loan, payments);

    return {
      loan,
      totalPaid: loan.getTotalPaidAmount(payments),
      totalPlanned: loan.getTotalPlannedAmount(payments),
      remainingBalance: loan.getRemainingBalance(payments),
      totalInterest: loan.getTotalInterest(payments),
      totalInterestPaid: loan.getTotalInterestPaid(payments),
      effectiveInterestRate: loan.calculateEffectiveInterestRate(payments),
      irrAnalysis,
      isFullyPaid: loan.isFullyPaid(payments),
      nextPaymentDate: this.getNextPaymentDate(payments),
      overduePayments: payments.filter(p => p.isOverdue()),
      activeSchedules: schedules.filter(s => s.isActive()),
    };
  }

  // Get all loan summaries
  async getAllLoanSummaries(): Promise<LoanSummary[]> {
    const loans = await this.loanRepository.findAll();
    const summaries: LoanSummary[] = [];

    for (const loan of loans) {
      if (loan.id) {
        const summary = await this.getLoanSummary(loan.id);
        if (summary) {
          summaries.push(summary);
        }
      }
    }

    return summaries;
  }

  private getNextPaymentDate(payments: LoanPayment[]): Date | null {
    const upcomingPayments = payments
      .filter(p => !p.isPaid && p.date >= new Date())
      .sort((a, b) => a.date.getTime() - b.date.getTime());

    return upcomingPayments.length > 0 ? upcomingPayments[0].date : null;
  }

  // Delete loan and all associated data
  async deleteLoan(loanId: number): Promise<void> {
    // Delete all payments for this loan
    await this.loanPaymentRepository.deleteByLoanId(loanId);

    // Delete all schedules for this loan
    await this.paymentScheduleRepository.deleteByLoanId(loanId);

    // Delete the loan itself
    await this.loanRepository.delete(loanId);
  }

  // Calculate portfolio-level loan metrics
  async getPortfolioLoanMetrics(): Promise<PortfolioLoanMetrics> {
    const summaries = await this.getAllLoanSummaries();

    const totalPrincipal = summaries.reduce((sum, s) => sum + s.loan.principalAmount, 0);
    const totalPaid = summaries.reduce((sum, s) => sum + s.totalPaid, 0);
    const totalInterestPaid = summaries.reduce((sum, s) => sum + s.totalInterestPaid, 0);
    const totalRemainingBalance = summaries.reduce((sum, s) => sum + s.remainingBalance, 0);

    const allOverduePayments = summaries.flatMap(s => s.overduePayments);
    const totalOverdueAmount = allOverduePayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalLoans: summaries.length,
      totalPrincipal,
      totalPaid,
      totalInterestPaid,
      totalRemainingBalance,
      overduePaymentsCount: allOverduePayments.length,
      totalOverdueAmount,
      averageInterestRate: this.calculateAverageInterestRate(summaries),
    };
  }

  private calculateAverageInterestRate(summaries: LoanSummary[]): number | undefined {
    const ratesWithPrincipal = summaries
      .filter(s => s.effectiveInterestRate !== undefined)
      .map(s => ({ rate: s.effectiveInterestRate!, principal: s.loan.principalAmount }));

    if (ratesWithPrincipal.length === 0) return undefined;

    const totalPrincipal = ratesWithPrincipal.reduce((sum, r) => sum + r.principal, 0);
    const weightedRateSum = ratesWithPrincipal.reduce((sum, r) => sum + r.rate * r.principal, 0);

    return weightedRateSum / totalPrincipal;
  }
}

// Type definitions for service responses
export interface LoanSummary {
  loan: Loan;
  totalPaid: number;
  totalPlanned: number;
  remainingBalance: number;
  totalInterest: number;
  totalInterestPaid: number;
  effectiveInterestRate: number | undefined;
  irrAnalysis: IRRAnalysis;
  isFullyPaid: boolean;
  nextPaymentDate: Date | null;
  overduePayments: LoanPayment[];
  activeSchedules: PaymentSchedule[];
}

export interface PortfolioLoanMetrics {
  totalLoans: number;
  totalPrincipal: number;
  totalPaid: number;
  totalInterestPaid: number;
  totalRemainingBalance: number;
  overduePaymentsCount: number;
  totalOverdueAmount: number;
  averageInterestRate: number | undefined;
}
