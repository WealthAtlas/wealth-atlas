import { IAsset } from '../../../domain/entities/assets/Asset';
import { db } from '../../database';

export class AssetRepository {
  async create(asset: IAsset): Promise<IAsset> {
    const id = await db.assets.add(asset);
    return { ...asset, id };
  }

  async getAll(): Promise<IAsset[]> {
    return await db.assets.toArray();
  }

  async getById(id: number): Promise<IAsset> {
    return (await db.assets.get(id))!;
  }

  async update(updates: IAsset): Promise<IAsset> {
    await db.assets.update(updates.id, updates);
    return { ...updates };
  }

  async delete(id: number): Promise<void> {
    await db.assets.delete(id);
  }
}
