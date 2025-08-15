import Dexie, { Table } from 'dexie';
import { User, PortfolioItem } from '../domain/types';

export class WealthAtlasDB extends Dexie {
  users!: Table<User>;
  portfolioItems!: Table<PortfolioItem>;

  constructor() {
    super('WealthAtlasDB');
    
    this.version(1).stores({
      users: '++id, username, email, createdAt',
      portfolioItems: '++id, userId, name, value, createdAt, updatedAt'
    });

    // Auto-populate timestamps
    this.users.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
    });

    this.portfolioItems.hook('creating', (primKey, obj, trans) => {
      obj.createdAt = new Date();
      obj.updatedAt = new Date();
    });

    this.portfolioItems.hook('updating', (modifications, primKey, obj, trans) => {
      modifications.updatedAt = new Date();
    });
  }
}

// Create and export database instance
export const db = new WealthAtlasDB();
