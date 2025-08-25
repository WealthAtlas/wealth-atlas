import { IScheduledAssetTransaction } from '../../../domain/entities/assets/ScheduledAssetTransaction';
import { db } from '../../database';

export class ScheduledAssetTransactionRepository {
  async create(transaction: IScheduledAssetTransaction): Promise<IScheduledAssetTransaction> {
    const id = await db.scheduledAssetTransactions.add(transaction);
    return { ...transaction, id };
  }

  async getByAssetId(assetId: number): Promise<IScheduledAssetTransaction[]> {
    return await db.scheduledAssetTransactions.where('assetId').equals(assetId).toArray();
  }

  async update(updates: IScheduledAssetTransaction): Promise<IScheduledAssetTransaction> {
    await db.scheduledAssetTransactions.update(updates.id, updates);
    return { ...updates };
  }

  async delete(id: number): Promise<void> {
    await db.scheduledAssetTransactions.delete(id);
  }

  async deleteByAssetId(assetId: number): Promise<void> {
    await db.scheduledAssetTransactions.where('assetId').equals(assetId).delete();
  }
}
