import { IAssetTransaction } from '../../../domain/entities/assets/AssetTransaction';
import { db } from '../../database';

export class AssetTransactionRepository {
  async create(transaction: IAssetTransaction): Promise<IAssetTransaction> {
    const id = await db.assetTransactions.add(transaction);
    return { ...transaction, id };
  }

  async getByAssetId(assetId: number): Promise<IAssetTransaction[]> {
    return await db.assetTransactions.where('assetId').equals(assetId).toArray();
  }

  async update(updates: IAssetTransaction): Promise<IAssetTransaction> {
    await db.assetTransactions.update(updates.id, updates);
    return { ...updates };
  }

  async delete(id: number): Promise<void> {
    await db.assetTransactions.delete(id);
  }

  async deleteByAssetId(assetId: number): Promise<void> {
    await db.assetTransactions.where('assetId').equals(assetId).delete();
  }
}
