import Dexie, { Table } from 'dexie';
import { IAsset } from '../domain/entities/assets/Asset';
import { IAssetTransaction } from '../domain/entities/assets/AssetTransaction';
import { IScheduledAssetTransaction } from '../domain/entities/assets/ScheduledAssetTransaction';
import { IExpense } from '../domain/entities/expenses/Expense';
import { ILoan } from '../domain/entities/loans/Loan';
import { ILoanPayment } from '../domain/entities/loans/LoanPayment';
import { IPaymentSchedule } from '../domain/entities/loans/PaymentSchedule';

export class WealthAtlasDB extends Dexie {
  assets!: Table<IAsset>;
  assetTransactions!: Table<IAssetTransaction>;
  scheduledAssetTransactions!: Table<IScheduledAssetTransaction>;
  expenses!: Table<IExpense>;
  loans!: Table<ILoan>;
  paymentSchedules!: Table<IPaymentSchedule>;
  loanPayments!: Table<ILoanPayment>;

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
  }
}

export const db = new WealthAtlasDB();
export const database = db;
