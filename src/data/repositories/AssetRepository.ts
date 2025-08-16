import { Asset } from "../../domain/entities/Asset";
import { AssetRecord } from "../records/AssetRecord";
import { db } from "../database";

// Repository handles data access and converts between domain and database
export class AssetRepository {
  // Convert database record to domain entity (DRY principle)
  private toDomain(record: AssetRecord): Asset {
    return {
      id: record.id,
      name: record.name,
      description: record.description
    };
  }

  // Convert domain entity to database record for saving
  private toRecord(asset: Asset): Omit<AssetRecord, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      name: asset.name,
      description: asset.description
    };
  }

  // Get all assets as domain entities
  async findAll(): Promise<Asset[]> {
    const records = await db.assets.toArray();
    return records.map(record => this.toDomain(record));
  }

  // Find asset by id
  async findById(id: number): Promise<Asset | null> {
    const record = await db.assets.get(id);
    return record ? this.toDomain(record) : null;
  }

  // Find assets by name (partial match)
  async findByName(name: string): Promise<Asset[]> {
    const records = await db.assets
      .where('name')
      .startsWithIgnoreCase(name)
      .toArray();
    return records.map(record => this.toDomain(record));
  }

  // Save new asset (create or update)
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

  // Delete asset
  async delete(id: number): Promise<void> {
    await db.assets.delete(id);
  }

  // Check if asset with name already exists
  async existsByName(name: string): Promise<boolean> {
    const count = await db.assets
      .where('name')
      .equalsIgnoreCase(name)
      .count();
    return count > 0;
  }

  // Get total count
  async count(): Promise<number> {
    return await db.assets.count();
  }
}
