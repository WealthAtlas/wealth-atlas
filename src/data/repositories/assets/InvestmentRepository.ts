import { IInvestment } from '../../../domain/entities/assets/Investment';
import { db } from '../../database';
import { deleteSynced } from '../../sync/merge/Tombstones';

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
    await deleteSynced('investments', [id]);
  }

  async deleteByAssetId(assetId: number): Promise<void> {
    // Read then delete, rather than a collection delete: a tombstone needs each
    // row's identity, which is only knowable before the row is gone.
    const rows = await db.investments.where('assetId').equals(assetId).toArray();
    await deleteSynced(
      'investments',
      rows.map(row => row.id)
    );
  }

  async deleteBySipId(sipId: number): Promise<void> {
    const rows = await db.investments.where('sipId').equals(sipId).toArray();
    await deleteSynced(
      'investments',
      rows.map(row => row.id)
    );
  }
}
