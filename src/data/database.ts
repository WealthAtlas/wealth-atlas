import Dexie, { Table } from 'dexie';
import { IAsset } from '../domain/entities/assets/Asset';
import { IAssetTransaction } from '../domain/entities/assets/AssetTransaction';
import { IScheduledAssetTransaction } from '../domain/entities/assets/ScheduledAssetTransaction';
import { IExpense } from '../domain/entities/expenses/Expense';
import { IScheduledExpense } from '../domain/entities/expenses/ScheduledExpense';
import { IAssetGoalAllocation } from '../domain/entities/goals/AssetGoalAllocation';
import { IGoal } from '../domain/entities/goals/Goal';
import { ILoan } from '../domain/entities/loans/Loan';
import { ILoanPayment } from '../domain/entities/loans/LoanPayment';
import { IPaymentSchedule } from '../domain/entities/loans/PaymentSchedule';

export class WealthAtlasDB extends Dexie {
  assets!: Table<IAsset>;
  assetTransactions!: Table<IAssetTransaction>;
  scheduledAssetTransactions!: Table<IScheduledAssetTransaction>;
  expenses!: Table<IExpense>;
  scheduledExpenses!: Table<IScheduledExpense>;
  loans!: Table<ILoan>;
  paymentSchedules!: Table<IPaymentSchedule>;
  loanPayments!: Table<ILoanPayment>;
  goals!: Table<IGoal>;
  assetGoalAllocations!: Table<IAssetGoalAllocation>;

  constructor() {
    super('WealthAtlasDB');
    this.setupSchema();
  }

  private setupSchema(): void {
    this.version(1).stores({
      assets: '++id, name, description',
    });

    // Version 2: Add new Asset fields and AssetTransactions table
    this.version(2).stores({
      assets: '++id, name, description, category, currency, currentMarketValue, valueUpdatedAt',
      assetTransactions: '++id, assetId, transactionType, quantity, price, date',
    });

    // Version 3: Add Expenses table
    this.version(3).stores({
      assets: '++id, name, description, category, currency, currentMarketValue, valueUpdatedAt',
      assetTransactions: '++id, assetId, transactionType, quantity, price, date',
      expenses: '++id, amount, currency, date, category, isEssential, description',
    });

    // Version 4: Add Loan tables
    this.version(4).stores({
      assets: '++id, name, description, category, currency, currentMarketValue, valueUpdatedAt',
      assetTransactions: '++id, assetId, transactionType, quantity, price, date',
      expenses: '++id, amount, currency, date, category, isEssential, description',
      loans: '++id, name, lenderName, principalAmount, currency, startDate, description',
      paymentSchedules:
        '++id, loanId, name, amount, frequency, startDate, endDate, lastGeneratedDate',
      loanPayments: '++id, loanId, date, amount, isPaid, description',
    });

    // Version 5: Add Scheduled Asset Transactions (SIP) table
    this.version(5).stores({
      assets: '++id, name, description, category, currency, currentMarketValue, valueUpdatedAt',
      assetTransactions: '++id, assetId, transactionType, quantity, price, date',
      scheduledAssetTransactions:
        '++id, assetId, transactionType, quantity, price, scheduledDate, frequency, endDate, totalOccurrences, isActive, isExecuted, executedTransactionId',
      expenses: '++id, amount, currency, date, category, isEssential, description',
      loans: '++id, name, lenderName, principalAmount, currency, startDate, description',
      paymentSchedules:
        '++id, loanId, name, amount, frequency, startDate, endDate, lastGeneratedDate',
      loanPayments: '++id, loanId, date, amount, isPaid, description',
    });

    // Version 6: Add Goals and Asset Goal Allocations tables
    this.version(6).stores({
      assets: '++id, name, description, category, currency, currentMarketValue, valueUpdatedAt',
      assetTransactions: '++id, assetId, transactionType, quantity, price, date',
      scheduledAssetTransactions:
        '++id, assetId, transactionType, quantity, price, scheduledDate, frequency, endDate, totalOccurrences, isActive, isExecuted, executedTransactionId',
      expenses: '++id, amount, currency, date, category, isEssential, description',
      loans: '++id, name, lenderName, principalAmount, currency, startDate, description',
      paymentSchedules:
        '++id, loanId, name, amount, frequency, startDate, endDate, lastGeneratedDate',
      loanPayments: '++id, loanId, date, amount, isPaid, description',
      goals: '++id, name, targetAmount, maturityDate, inflationRate, currency, createdAt',
      assetGoalAllocations: '++id, assetId, goalId, allocationPercentage, createdAt',
    });

    // Version 7: Add Scheduled Expenses table
    this.version(7).stores({
      assets: '++id, name, description, category, currency, currentMarketValue, valueUpdatedAt',
      assetTransactions: '++id, assetId, transactionType, quantity, price, date',
      scheduledAssetTransactions:
        '++id, assetId, transactionType, quantity, price, scheduledDate, frequency, endDate, totalOccurrences, isActive, isExecuted, executedTransactionId',
      expenses: '++id, amount, currency, date, category, isEssential, description',
      scheduledExpenses:
        '++id, name, amount, currency, category, isEssential, frequency, startDate, endDate, lastGeneratedDate, description',
      loans: '++id, name, lenderName, principalAmount, currency, startDate, description',
      paymentSchedules:
        '++id, loanId, name, amount, frequency, startDate, endDate, lastGeneratedDate',
      loanPayments: '++id, loanId, date, amount, isPaid, description',
      goals: '++id, name, targetAmount, maturityDate, inflationRate, currency, createdAt',
      assetGoalAllocations: '++id, assetId, goalId, allocationPercentage, createdAt',
    });
  }
}

export const db = new WealthAtlasDB();
export const database = db;
