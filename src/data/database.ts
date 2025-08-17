import Dexie, { Table } from 'dexie';
import { IAsset } from '../domain/entities/Asset';
import { IAssetTransaction } from '../domain/entities/AssetTransaction';

export class WealthAtlasDB extends Dexie {
  assets!: Table<IAsset>;
  assetTransactions!: Table<IAssetTransaction>;

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
  }
}

export const db = new WealthAtlasDB();
