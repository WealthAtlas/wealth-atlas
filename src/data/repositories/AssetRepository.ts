import { Asset, IAsset } from '../../domain/entities/assets/Asset';
import { db } from '../database';

export class AssetRepository {
  private toDomain(record: IAsset): Asset {
    return new Asset(
      record.id,
      record.name,
      record.description,
      record.category,
      record.currency,
      record.currentMarketValue,
      record.valueUpdatedAt
    );
  }

  private toRecord(asset: Asset): Omit<IAsset, 'id'> {
    return {
      name: asset.name,
      description: asset.description,
      category: asset.category,
      currency: asset.currency,
      currentMarketValue: asset.currentMarketValue,
      valueUpdatedAt: asset.valueUpdatedAt,
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
      return new Asset(
        newId,
        asset.name,
        asset.description,
        asset.category,
        asset.currency,
        asset.currentMarketValue,
        asset.valueUpdatedAt
      );
    }
  }

  async delete(id: number): Promise<void> {
    await db.assets.delete(id);
  }
}
