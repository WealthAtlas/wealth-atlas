import { ISIP } from '../../../domain/entities/assets/SIP';
import { db } from '../../database';

export class SIPRepository {
  async create(transaction: ISIP): Promise<ISIP> {
    const id = await db.sips.add(transaction);
    return { ...transaction, id };
  }

  async getByAssetId(assetId: number): Promise<ISIP[]> {
    return await db.sips.where('assetId').equals(assetId).toArray();
  }

  async update(updates: ISIP): Promise<ISIP> {
    await db.sips.update(updates.id, updates);
    return { ...updates };
  }

  async delete(id: number): Promise<void> {
    await db.sips.delete(id);
  }

  async deleteByAssetId(assetId: number): Promise<void> {
    await db.sips.where('assetId').equals(assetId).delete();
  }
}
