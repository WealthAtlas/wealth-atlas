import Dexie, { Table } from 'dexie';
import { IAsset } from '../domain/entities/Asset';
import { IAssetTransaction } from '../domain/entities/AssetTransaction';
import { IExpense } from '../domain/entities/Expense';

export class WealthAtlasDB extends Dexie {
  assets!: Table<IAsset>;
  assetTransactions!: Table<IAssetTransaction>;
  expenses!: Table<IExpense>;

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
  }
}

export const db = new WealthAtlasDB();
export const database = db;
