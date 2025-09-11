import Dexie, { Table } from 'dexie';
import { IAsset } from '../domain/entities/assets/Asset';
import { IInvestment } from '../domain/entities/assets/Investment';
import { ISIP } from '../domain/entities/assets/SIP';
import { IExpense } from '../domain/entities/expenses/Expense';
import { IAllocation } from '../domain/entities/goals/Allocation';
import { IGoal } from '../domain/entities/goals/Goal';
import { IEMI } from '../domain/entities/loans/EMI';
import { ILoan } from '../domain/entities/loans/Loan';
import { IPayment } from '../domain/entities/loans/Payment';
import { AutoSyncService } from './sync/AutoSyncService';

export class WealthAtlasDB extends Dexie {
  assets!: Table<IAsset>;
  investments!: Table<IInvestment>;
  sips!: Table<ISIP>;
  expenses!: Table<IExpense>;
  loans!: Table<ILoan>;
  emis!: Table<IEMI>;
  payments!: Table<IPayment>;
  goals!: Table<IGoal>;
  allocations!: Table<IAllocation>;

  constructor() {
    super('WealthAtlasDB');
    this.setupSchema();
    this.setupAutoSync();
  }

  private setupSchema(): void {
    this.version(2).stores({
      assets:
        '++id, name, description, category, currency, valueModel, interestRate, maturityDate, maturityAmount, marketValue, marketValueUpdatedAt, apiPath',
      investments: '++id, assetId, sipId, type, quantity, price, date',
      sips: '++id, assetId, quantity, price, startDate, endDate, frequency, executedTill',
      expenses: '++id, amount, currency, date, category, isEssential, description',
      loans: '++id, name, lenderName, principalAmount, currency, startDate, description',
      emis: '++id, loanId, name, amount, frequency, startDate, endDate, lastGeneratedDate',
      payments: '++id, loanId, emiId, date, amount, isPaid, description',
      goals: '++id, name, targetAmount, maturityDate, inflationRate, currency, createdAt',
      allocations: '++id, assetId, goalId, allocationPercentage, createdAt',
    });
  }

  private setupAutoSync(): void {
    // Initialize auto-sync service when database is ready
    this.on('ready', () => {
      AutoSyncService.startListening();
    });
  }
}

export const db = new WealthAtlasDB();
export const database = db;
