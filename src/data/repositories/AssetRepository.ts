import { Asset } from '../../domain/entities/Asset';
import { db } from '../database';
import { AssetRecord } from '../records/AssetRecord';

export class AssetRepository {
  private toDomain(record: AssetRecord): Asset {
    return {
      id: record.id,
      name: record.name,
      description: record.description,
    };
  }

  private toRecord(asset: Asset): Omit<AssetRecord, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: asset.name,
      description: asset.description,
    };
  }

  async findAll(): Promise<Asset[]> {
    const records = await db.assets.toArray();
    return records.map(record => this.toDomain(record));
  }

  async findById(id: number): Promise<Asset | null> {
    const record = await db.assets.get(id);
    return record ? this.toDomain(record) : null;
  }

  async save(asset: Asset): Promise<Asset> {
    const recordData = this.toRecord(asset);

    if (asset.id) {
      // Update existing
      await db.assets.update(asset.id, recordData);
      return asset;
    } else {
      // Create new
      const newId = await db.assets.add(recordData);
      return { ...asset, id: newId };
    }
  }

  async delete(id: number): Promise<void> {
    await db.assets.delete(id);
  }
}
