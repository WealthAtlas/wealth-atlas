import { beforeEach, describe, expect, it } from 'vitest';
import { Loan } from '../../entities/loans/Loan';
import { LoanPayment } from '../../entities/loans/LoanPayment';
import { IRRAnalysisService } from '../IRRAnalysisService';

describe('IRRAnalysisService', () => {
  let testLoan: Loan;

  beforeEach(() => {
    testLoan = new Loan(
      1,
      'Test Loan',
      'Test Bank',
      100000,
      'USD',
      new Date('2024-01-01'),
      'Test loan for IRR calculation'
    );
  });

  describe('calculateIRRAnalysis', () => {
    it('should return N/A when no payments are made', () => {
      const payments: LoanPayment[] = [];
      const analysis = IRRAnalysisService.calculateIRRAnalysis(testLoan, payments);

      expect(analysis.annualizedRate).toBeUndefined();
      expect(analysis.monthlyRate).toBeUndefined();
      expect(analysis.paymentPeriods).toBe(0);
      expect(analysis.isReliable).toBe(false);
    });

    it('should return N/A when payments exist but none are paid', () => {
      const payments: LoanPayment[] = [
        new LoanPayment(1, 1, new Date('2024-02-01'), 4500, false, 'Monthly payment'),
        new LoanPayment(2, 1, new Date('2024-03-01'), 4500, false, 'Monthly payment'),
      ];

      const analysis = IRRAnalysisService.calculateIRRAnalysis(testLoan, payments);

      expect(analysis.annualizedRate).toBeUndefined();
      expect(analysis.monthlyRate).toBeUndefined();
      expect(analysis.paymentPeriods).toBe(0);
      expect(analysis.isReliable).toBe(false);
    });

    it('should calculate IRR for a simple loan scenario', () => {
      // Simple scenario: $100k loan with monthly payments of $4500 for 24 months
      // This should result in approximately 5% annual interest rate
      const payments: LoanPayment[] = [];

      // Generate 12 paid monthly payments
      for (let i = 1; i <= 12; i++) {
        payments.push(new LoanPayment(i, 1, new Date(2024, i - 1, 1), 4500, true, `Payment ${i}`));
      }

      const analysis = IRRAnalysisService.calculateIRRAnalysis(testLoan, payments);

      expect(analysis.annualizedRate).toBeDefined();
      expect(analysis.annualizedRate).toBeGreaterThan(0);
      expect(analysis.annualizedRate).toBeLessThan(100); // Reasonable range
      expect(analysis.monthlyRate).toBeDefined();
      expect(analysis.paymentPeriods).toBe(12);
      expect(analysis.totalInterestAmount).toBeGreaterThan(0);
    });

    it('should calculate accurate IRR for known scenario', () => {
      // Known scenario: $10,000 loan, paid back $11,000 over 12 months
      // Should be approximately 10% annual rate
      const smallLoan = new Loan(
        2,
        'Small Test Loan',
        'Test Bank',
        10000,
        'USD',
        new Date('2024-01-01'),
        'Small loan for precise IRR testing'
      );

      // 12 monthly payments of approximately $916.67 each (total $11,000)
      const payments: LoanPayment[] = [];
      for (let i = 1; i <= 12; i++) {
        payments.push(
          new LoanPayment(i, 2, new Date(2024, i - 1, 1), 916.67, true, `Payment ${i}`)
        );
      }

      const analysis = IRRAnalysisService.calculateIRRAnalysis(smallLoan, payments);

      expect(analysis.annualizedRate).toBeDefined();
      // Should be approximately 10% (allowing for some calculation variance)
      expect(analysis.annualizedRate!).toBeGreaterThan(8);
      expect(analysis.annualizedRate!).toBeLessThan(12);
      expect(analysis.paymentPeriods).toBe(12);
      expect(analysis.isReliable).toBe(true);
    });

    it('should handle partial payments correctly', () => {
      const payments: LoanPayment[] = [
        new LoanPayment(1, 1, new Date('2024-02-01'), 4500, true, 'First payment'),
        new LoanPayment(2, 1, new Date('2024-03-01'), 4500, true, 'Second payment'),
        new LoanPayment(3, 1, new Date('2024-04-01'), 4500, false, 'Future payment'),
      ];

      const analysis = IRRAnalysisService.calculateIRRAnalysis(testLoan, payments);

      expect(analysis.paymentPeriods).toBe(2); // Only paid payments counted
      expect(analysis.totalInterestAmount).toBe(-91000); // 9000 paid - 100000 principal
      expect(analysis.isReliable).toBe(false); // Too few payments for reliability
    });

    it('should assess risk levels correctly', () => {
      const payments: LoanPayment[] = [];

      // Generate many payments for reliable calculation
      for (let i = 1; i <= 24; i++) {
        payments.push(
          new LoanPayment(
            i,
            1,
            new Date(2024, Math.floor((i - 1) / 12), ((i - 1) % 12) + 1),
            4500,
            true,
            `Payment ${i}`
          )
        );
      }

      const analysis = IRRAnalysisService.calculateIRRAnalysis(testLoan, payments);

      expect(analysis.riskLevel).toBeOneOf(['LOW', 'MEDIUM', 'HIGH']);
      expect(analysis.riskFactors).toBeInstanceOf(Array);
      expect(analysis.isReliable).toBe(true); // Should be reliable with 24 payments
    });
  });

  describe('formatIRR', () => {
    it('should format N/A for undefined rate with no payments', () => {
      const analysis = {
        annualizedRate: undefined,
        monthlyRate: undefined,
        effectiveAnnualRate: undefined,
        paymentPeriods: 0,
        totalInterestAmount: 0,
        isReliable: false,
        riskLevel: 'HIGH' as const,
        riskFactors: [],
      };

      const formatted = IRRAnalysisService.formatIRR(analysis);

      expect(formatted.primary).toBe('Pending');
      expect(formatted.secondary).toBe('No payments yet');
      expect(formatted.tooltip).toContain('once payments are made');
    });

    it('should format N/A for undefined rate with payments', () => {
      const analysis = {
        annualizedRate: undefined,
        monthlyRate: undefined,
        effectiveAnnualRate: undefined,
        paymentPeriods: 2,
        totalInterestAmount: 1000,
        isReliable: false,
        riskLevel: 'HIGH' as const,
        riskFactors: [],
      };

      const formatted = IRRAnalysisService.formatIRR(analysis);

      expect(formatted.primary).toBe('N/A');
      expect(formatted.secondary).toBe('Insufficient data');
      expect(formatted.tooltip).toContain('Not enough payment history');
    });

    it('should format low rates correctly', () => {
      const analysis = {
        annualizedRate: 0.5,
        monthlyRate: 0.5 / 12,
        effectiveAnnualRate: 0.5,
        paymentPeriods: 12,
        totalInterestAmount: 500,
        isReliable: true,
        riskLevel: 'LOW' as const,
        riskFactors: [],
      };

      const formatted = IRRAnalysisService.formatIRR(analysis);

      expect(formatted.primary).toBe('0.50%');
      expect(formatted.secondary).toBe('12 payments');
    });

    it('should format normal rates correctly', () => {
      const analysis = {
        annualizedRate: 5.25,
        monthlyRate: 5.25 / 12,
        effectiveAnnualRate: 5.25,
        paymentPeriods: 24,
        totalInterestAmount: 2500,
        isReliable: true,
        riskLevel: 'LOW' as const,
        riskFactors: [],
      };

      const formatted = IRRAnalysisService.formatIRR(analysis);

      expect(formatted.primary).toBe('5.3%');
      expect(formatted.secondary).toBe('24 payments');
    });

    it('should include risk indicators', () => {
      const highRiskAnalysis = {
        annualizedRate: 15.0,
        monthlyRate: 15.0 / 12,
        effectiveAnnualRate: 15.0,
        paymentPeriods: 6,
        totalInterestAmount: 1500,
        isReliable: false,
        riskLevel: 'HIGH' as const,
        riskFactors: ['High interest rate', 'Few payments'],
      };

      const formatted = IRRAnalysisService.formatIRR(highRiskAnalysis);

      expect(formatted.primary).toContain('⚠️');
      expect(formatted.secondary).toBe('Preliminary');
    });

    it('should include medium risk indicators', () => {
      const mediumRiskAnalysis = {
        annualizedRate: 8.0,
        monthlyRate: 8.0 / 12,
        effectiveAnnualRate: 8.0,
        paymentPeriods: 12,
        totalInterestAmount: 800,
        isReliable: true,
        riskLevel: 'MEDIUM' as const,
        riskFactors: ['Moderate variance'],
      };

      const formatted = IRRAnalysisService.formatIRR(mediumRiskAnalysis);

      expect(formatted.primary).toContain('⚡');
      expect(formatted.secondary).toBe('12 payments');
    });
  });

  describe('edge cases', () => {
    it('should handle very small loan amounts', () => {
      const smallLoan = new Loan(
        3,
        'Tiny Loan',
        'Test Bank',
        100,
        'USD',
        new Date('2024-01-01'),
        'Very small loan'
      );

      const payments: LoanPayment[] = [
        new LoanPayment(1, 3, new Date('2024-12-31'), 110, true, 'Full repayment'),
      ];

      const analysis = IRRAnalysisService.calculateIRRAnalysis(smallLoan, payments);

      expect(analysis.paymentPeriods).toBe(1);
      expect(analysis.totalInterestAmount).toBe(10);
    });

    it('should handle loans with overpayments', () => {
      const payments: LoanPayment[] = [
        new LoanPayment(1, 1, new Date('2024-06-01'), 120000, true, 'Single large payment'),
      ];

      const analysis = IRRAnalysisService.calculateIRRAnalysis(testLoan, payments);

      expect(analysis.paymentPeriods).toBe(1);
      expect(analysis.totalInterestAmount).toBe(20000); // 120k - 100k
      expect(analysis.annualizedRate).toBeDefined();
      expect(analysis.annualizedRate).toBeGreaterThan(0);
    });

    it('should handle future payment dates gracefully', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const payments: LoanPayment[] = [
        new LoanPayment(1, 1, futureDate, 4500, true, 'Future dated payment'),
      ];

      const analysis = IRRAnalysisService.calculateIRRAnalysis(testLoan, payments);

      expect(analysis.paymentPeriods).toBe(1);
      expect(analysis.annualizedRate).toBeDefined();
    });
  });
});
