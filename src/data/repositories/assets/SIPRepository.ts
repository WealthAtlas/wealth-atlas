import { ISIP } from '../../../domain/entities/assets/SIP';
import { db } from '../../database';
import { deleteSynced } from '../../sync/merge/Tombstones';

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
    await deleteSynced('sips', [id]);
  }

  async deleteByAssetId(assetId: number): Promise<void> {
    // Read then delete, rather than a collection delete: a tombstone needs each
    // row's identity, which is only knowable before the row is gone.
    const rows = await db.sips.where('assetId').equals(assetId).toArray();
    await deleteSynced(
      'sips',
      rows.map(row => row.id)
    );
  }
}
