import Dexie, { Table } from 'dexie';
import { IAsset } from '../domain/entities/Asset';
import { IAssetTransaction } from '../domain/entities/AssetTransaction';
import { IExpense } from '../domain/entities/Expense';
import { ILoan } from '../domain/entities/Loan';
import { ILoanPayment } from '../domain/entities/LoanPayment';
import { IPaymentSchedule } from '../domain/entities/PaymentSchedule';

export class WealthAtlasDB extends Dexie {
  assets!: Table<IAsset>;
  assetTransactions!: Table<IAssetTransaction>;
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
  }
}

export const db = new WealthAtlasDB();
export const database = db;
