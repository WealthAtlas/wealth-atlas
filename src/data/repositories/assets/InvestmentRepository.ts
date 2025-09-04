import { IInvestment } from '../../../domain/entities/assets/Investment';
import { db } from '../../database';

export class InvestmentRepository {
  async create(transaction: IInvestment): Promise<IInvestment> {
    const id = await db.investments.add(transaction);
    return { ...transaction, id };
  }

  async getByAssetId(assetId: number): Promise<IInvestment[]> {
    return await db.investments.where('assetId').equals(assetId).toArray();
  }

  async update(updates: IInvestment): Promise<IInvestment> {
    await db.investments.update(updates.id, updates);
    return { ...updates };
  }

  async delete(id: number): Promise<void> {
    await db.investments.delete(id);
  }

  async deleteByAssetId(assetId: number): Promise<void> {
    await db.investments.where('assetId').equals(assetId).delete();
  }
}
