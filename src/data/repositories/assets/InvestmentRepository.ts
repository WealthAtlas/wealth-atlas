import { IInvestment } from '../../../domain/entities/assets/Investment';
import { db } from '../../database';

export class InvestmentRepository {
  async create(transaction: IInvestment): Promise<IInvestment> {
    const id = await db.assetTransactions.add(transaction);
    return { ...transaction, id };
  }

  async getByAssetId(assetId: number): Promise<IInvestment[]> {
    return await db.assetTransactions.where('assetId').equals(assetId).toArray();
  }

  async update(updates: IInvestment): Promise<IInvestment> {
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
