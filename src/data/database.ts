import Dexie, { Table } from 'dexie';
import { AssetRecord } from './records/AssetRecord';

export class WealthAtlasDB extends Dexie {
  assets!: Table<AssetRecord>;

  constructor() {
    super('WealthAtlasDB');
    this.setupSchema();
    this.setupHooks();
  }

  private setupSchema(): void {
    this.version(1).stores({
      assets: '++id, name, description, createdAt, updatedAt'
    });
  }

  private setupHooks(): void {
    this.setupTimestampHooks(this.assets);
  }

  private setupTimestampHooks<T extends { createdAt?: Date; updatedAt?: Date }>(
    table: Table<T>
  ): void {
    // Auto-populate timestamps on creation
    table.hook('creating', (primKey, obj, trans) => {
      const now = new Date();
      obj.createdAt = now;
      obj.updatedAt = now;
    });

    // Auto-update timestamp on modification
    table.hook('updating', (modifications, primKey, obj, trans) => {
      (modifications as any).updatedAt = new Date();
    });
  }
}

export const db = new WealthAtlasDB();
