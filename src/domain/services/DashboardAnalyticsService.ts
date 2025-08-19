import { AssetRepository } from '../../data/repositories/AssetRepository';
import { AssetTransactionRepository } from '../../data/repositories/AssetTransactionRepository';
import { ExpenseRepository } from '../../data/repositories/ExpenseRepository';
import { LoanPaymentRepository } from '../../data/repositories/LoanPaymentRepository';
import { LoanRepository } from '../../data/repositories/LoanRepository';
import { Asset } from '../entities/assets/Asset';
import { AssetTransaction } from '../entities/assets/AssetTransaction';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConversionService } from './CurrencyConversionService';
import { PortfolioService } from './PortfolioService';

export interface DashboardMetrics {
  portfolio: PortfolioMetrics;
  loans: LoanMetrics;
  expenses: ExpenseMetrics;
}

export interface PortfolioMetrics {
  totalInvested: number;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  currency: string;
  assetBreakdown: AssetBreakdownItem[];
  growthTimeline: PortfolioTimelinePoint[];
}

export interface AssetBreakdownItem {
  assetName: string;
  category: string;
  currentValue: number;
  profitLoss: number;
  profitLossPercentage: number;
  percentage: number; // Percentage of total portfolio
}

export interface PortfolioTimelinePoint {
  date: Date;
  investedAmount: number;
  marketValue: number;
}

export interface LoanMetrics {
  totalOutstanding: number;
  totalPending: number;
  nextPaymentDue: {
    date: Date | null;
    amount: number;
    loanName: string;
  } | null;
  currency: string;
  loanBreakdown: LoanBreakdownItem[];
}

export interface LoanBreakdownItem {
  loanName: string;
  outstandingAmount: number;
  nextPaymentAmount: number;
  nextPaymentDate: Date | null;
}

export interface ExpenseMetrics {
  currentMonthTotal: number;
  currentMonthEssential: number;
  currentMonthNonEssential: number;
  previousMonthTotal: number;
  monthOverMonthChange: number;
  monthOverMonthPercentage: number;
  currency: string;
}

export class DashboardAnalyticsService {
  private portfolioService: PortfolioService;

  constructor(
    private assetRepository: AssetRepository,
    private assetTransactionRepository: AssetTransactionRepository,
    private expenseRepository: ExpenseRepository,
    private loanRepository: LoanRepository,
    private loanPaymentRepository: LoanPaymentRepository,
    private homeCurrency: string = Currency.USD
  ) {
    this.portfolioService = new PortfolioService();
  }

  /**
   * Get comprehensive dashboard metrics
   */
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [portfolioMetrics, loanMetrics, expenseMetrics] = await Promise.all([
      this.getPortfolioMetrics(),
      this.getLoanMetrics(),
      this.getExpenseMetrics(),
    ]);

    return {
      portfolio: portfolioMetrics,
      loans: loanMetrics,
      expenses: expenseMetrics,
    };
  }

  /**
   * Calculate portfolio metrics in home currency
   */
  private async getPortfolioMetrics(): Promise<PortfolioMetrics> {
    const assets = await this.assetRepository.findAll();
    const allTransactions = await this.assetTransactionRepository.findAll();

    let totalInvested = 0;
    let totalCurrentValue = 0;
    const assetBreakdown: AssetBreakdownItem[] = [];
    const timelineData = new Map<string, PortfolioTimelinePoint>();

    for (const asset of assets) {
      const transactions = allTransactions.filter(t => t.assetId === asset.id);
      const summary = this.portfolioService.getAssetSummary(asset, transactions);

      // Convert to home currency
      const investedInHome = CurrencyConversionService.convertToHomeCurrency(
        summary.totalInvested,
        asset.currency,
        this.homeCurrency
      );

      const currentValueInHome = summary.currentValue
        ? CurrencyConversionService.convertToHomeCurrency(
            summary.currentValue,
            asset.currency,
            this.homeCurrency
          )
        : 0;

      totalInvested += investedInHome;
      totalCurrentValue += currentValueInHome;

      // Add to asset breakdown
      if (summary.currentValue && summary.currentValue > 0) {
        assetBreakdown.push({
          assetName: asset.name,
          category: asset.category,
          currentValue: currentValueInHome,
          profitLoss: currentValueInHome - investedInHome,
          profitLossPercentage: summary.profitLossPercentage || 0,
          percentage: 0, // Will be calculated after we have total
        });
      }

      // Build timeline data
      this.buildTimelineData(asset, transactions, timelineData);
    }

    // Calculate percentages for asset breakdown
    assetBreakdown.forEach(item => {
      item.percentage = totalCurrentValue > 0 ? (item.currentValue / totalCurrentValue) * 100 : 0;
    });

    // Convert timeline data to sorted array
    const growthTimeline = Array.from(timelineData.values()).sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    return {
      totalInvested,
      currentValue: totalCurrentValue,
      profitLoss: totalCurrentValue - totalInvested,
      profitLossPercentage:
        totalInvested > 0 ? ((totalCurrentValue - totalInvested) / totalInvested) * 100 : 0,
      currency: this.homeCurrency,
      assetBreakdown,
      growthTimeline,
    };
  }

  /**
   * Calculate loan metrics in home currency
   */
  private async getLoanMetrics(): Promise<LoanMetrics> {
    const loans = await this.loanRepository.findAll();
    const allPayments = await this.loanPaymentRepository.findAll();

    let totalOutstanding = 0;
    let totalPending = 0;
    let nextPaymentDue: LoanMetrics['nextPaymentDue'] = null;
    const loanBreakdown: LoanBreakdownItem[] = [];

    for (const loan of loans) {
      const payments = allPayments.filter(p => p.loanId === loan.id);

      // Calculate outstanding amount (principal - paid payments)
      const paidAmount = payments.filter(p => p.isPaid).reduce((sum, p) => sum + p.amount, 0);

      const outstandingInHome = CurrencyConversionService.convertToHomeCurrency(
        loan.principalAmount - paidAmount,
        loan.currency,
        this.homeCurrency
      );

      totalOutstanding += outstandingInHome;

      // Calculate pending payments
      const pendingPayments = payments.filter(p => !p.isPaid);
      const pendingAmount = pendingPayments.reduce((sum, p) => sum + p.amount, 0);
      const pendingInHome = CurrencyConversionService.convertToHomeCurrency(
        pendingAmount,
        loan.currency,
        this.homeCurrency
      );

      totalPending += pendingInHome;

      // Find next payment due
      const nextPayment = pendingPayments.sort((a, b) => a.date.getTime() - b.date.getTime())[0];

      if (nextPayment && (!nextPaymentDue || nextPayment.date < nextPaymentDue.date!)) {
        nextPaymentDue = {
          date: nextPayment.date,
          amount: CurrencyConversionService.convertToHomeCurrency(
            nextPayment.amount,
            loan.currency,
            this.homeCurrency
          ),
          loanName: loan.name,
        };
      }

      // Add to loan breakdown
      loanBreakdown.push({
        loanName: loan.name,
        outstandingAmount: outstandingInHome,
        nextPaymentAmount: nextPayment
          ? CurrencyConversionService.convertToHomeCurrency(
              nextPayment.amount,
              loan.currency,
              this.homeCurrency
            )
          : 0,
        nextPaymentDate: nextPayment?.date || null,
      });
    }

    return {
      totalOutstanding,
      totalPending,
      nextPaymentDue,
      currency: this.homeCurrency,
      loanBreakdown,
    };
  }

  /**
   * Calculate expense metrics in home currency
   */
  private async getExpenseMetrics(): Promise<ExpenseMetrics> {
    const expenses = await this.expenseRepository.findAll();

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const previousMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const previousMonthStr = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;

    // Filter expenses by month
    const currentMonthExpenses = expenses.filter(e => e.getMonthYear() === currentMonth);
    const previousMonthExpenses = expenses.filter(e => e.getMonthYear() === previousMonthStr);

    // Calculate current month totals
    let currentMonthTotal = 0;
    let currentMonthEssential = 0;
    let currentMonthNonEssential = 0;

    currentMonthExpenses.forEach(expense => {
      const amountInHome = CurrencyConversionService.convertToHomeCurrency(
        expense.amount,
        expense.currency,
        this.homeCurrency
      );

      currentMonthTotal += amountInHome;

      if (expense.isEssential) {
        currentMonthEssential += amountInHome;
      } else {
        currentMonthNonEssential += amountInHome;
      }
    });

    // Calculate previous month total
    let previousMonthTotal = 0;
    previousMonthExpenses.forEach(expense => {
      const amountInHome = CurrencyConversionService.convertToHomeCurrency(
        expense.amount,
        expense.currency,
        this.homeCurrency
      );
      previousMonthTotal += amountInHome;
    });

    // Calculate month-over-month change
    const monthOverMonthChange = currentMonthTotal - previousMonthTotal;
    const monthOverMonthPercentage =
      previousMonthTotal > 0 ? (monthOverMonthChange / previousMonthTotal) * 100 : 0;

    return {
      currentMonthTotal,
      currentMonthEssential,
      currentMonthNonEssential,
      previousMonthTotal,
      monthOverMonthChange,
      monthOverMonthPercentage,
      currency: this.homeCurrency,
    };
  }

  /**
   * Build timeline data for portfolio growth chart
   */
  private buildTimelineData(
    asset: Asset,
    transactions: AssetTransaction[],
    timelineData: Map<string, PortfolioTimelinePoint>
  ): void {
    // Sort transactions by date
    const sortedTransactions = [...transactions].sort(
      (a, b) => a.date.getTime() - b.date.getTime()
    );

    let cumulativeInvested = 0;

    sortedTransactions.forEach(transaction => {
      const dateKey = transaction.date.toISOString().split('T')[0]; // YYYY-MM-DD format

      // Update cumulative invested amount
      const transactionAmount = (transaction.quantity || 1) * transaction.price;
      if (transaction.transactionType === 'buy') {
        cumulativeInvested += transactionAmount;
      } else {
        cumulativeInvested -= transactionAmount;
      }

      // Convert to home currency
      const investedInHome = CurrencyConversionService.convertToHomeCurrency(
        cumulativeInvested,
        asset.currency,
        this.homeCurrency
      );

      // Calculate market value at this point (simplified - uses current market value)
      const holdings = asset.getCurrentHoldings(
        sortedTransactions.filter(t => t.date <= transaction.date)
      );
      const marketValueInAssetCurrency = holdings * (asset.currentMarketValue || transaction.price);
      const marketValueInHome = CurrencyConversionService.convertToHomeCurrency(
        marketValueInAssetCurrency,
        asset.currency,
        this.homeCurrency
      );

      // Update or create timeline point
      if (timelineData.has(dateKey)) {
        const existing = timelineData.get(dateKey)!;
        existing.investedAmount += investedInHome;
        existing.marketValue += marketValueInHome;
      } else {
        timelineData.set(dateKey, {
          date: new Date(transaction.date),
          investedAmount: investedInHome,
          marketValue: marketValueInHome,
        });
      }
    });
  }
}
