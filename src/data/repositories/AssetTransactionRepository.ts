import { AssetTransaction, IAssetTransaction } from '../../domain/entities/AssetTransaction';
import { db } from '../database';

export class AssetTransactionRepository {
  private toDomain(record: IAssetTransaction): AssetTransaction {
    return new AssetTransaction(
      record.id,
      record.assetId,
      record.transactionType,
      record.quantity,
      record.price,
      record.date
    );
  }

  private toRecord(transaction: AssetTransaction): Omit<IAssetTransaction, 'id'> {
    return {
      assetId: transaction.assetId!,
      transactionType: transaction.transactionType,
      quantity: transaction.quantity,
      price: transaction.price,
      date: transaction.date,
    };
  }

  async findAll(): Promise<AssetTransaction[]> {
    const records = await db.assetTransactions.toArray();
    return records.map(record => this.toDomain(record));
  }

  async findById(id: number): Promise<AssetTransaction | null> {
    const record = await db.assetTransactions.get(id);
    return record ? this.toDomain(record) : null;
  }

  async findByAssetId(assetId: number): Promise<AssetTransaction[]> {
    const records = await db.assetTransactions.where('assetId').equals(assetId).toArray();
    return records.map(record => this.toDomain(record));
  }

  async save(transaction: AssetTransaction): Promise<AssetTransaction> {
    const recordData = this.toRecord(transaction);

    if (transaction.id) {
      // Update existing
      await db.assetTransactions.update(transaction.id, recordData);
      return transaction;
    } else {
      // Create new
      const newId = await db.assetTransactions.add(recordData);
      return new AssetTransaction(
        newId,
        transaction.assetId,
        transaction.transactionType,
        transaction.quantity,
        transaction.price,
        transaction.date
      );
    }
  }

  async delete(id: number): Promise<void> {
    await db.assetTransactions.delete(id);
  }

  async deleteByAssetId(assetId: number): Promise<void> {
    await db.assetTransactions.where('assetId').equals(assetId).delete();
  }
}
