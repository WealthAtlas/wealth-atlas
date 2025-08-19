import {
  IScheduledAssetTransaction,
  ScheduledAssetTransaction,
} from '../../domain/entities/assets/ScheduledAssetTransaction';
import { db } from '../database';

export class ScheduledAssetTransactionRepository {
  private toDomain(record: IScheduledAssetTransaction): ScheduledAssetTransaction {
    return new ScheduledAssetTransaction(
      record.id,
      record.assetId,
      record.transactionType,
      record.quantity,
      record.price,
      record.scheduledDate,
      record.frequency,
      record.endDate,
      record.totalOccurrences,
      record.isActive,
      record.isExecuted,
      record.executedTransactionId
    );
  }

  private toRecord(
    scheduledTransaction: ScheduledAssetTransaction
  ): Omit<IScheduledAssetTransaction, 'id'> {
    return {
      assetId: scheduledTransaction.assetId,
      transactionType: scheduledTransaction.transactionType,
      quantity: scheduledTransaction.quantity,
      price: scheduledTransaction.price,
      scheduledDate: scheduledTransaction.scheduledDate,
      frequency: scheduledTransaction.frequency,
      endDate: scheduledTransaction.endDate,
      totalOccurrences: scheduledTransaction.totalOccurrences,
      isActive: scheduledTransaction.isActive,
      isExecuted: scheduledTransaction.isExecuted,
      executedTransactionId: scheduledTransaction.executedTransactionId,
    };
  }

  async findAll(): Promise<ScheduledAssetTransaction[]> {
    const records = await db.scheduledAssetTransactions.toArray();
    return records.map(record => this.toDomain(record));
  }

  async findById(id: number): Promise<ScheduledAssetTransaction | null> {
    const record = await db.scheduledAssetTransactions.get(id);
    return record ? this.toDomain(record) : null;
  }

  async findByAssetId(assetId: number): Promise<ScheduledAssetTransaction[]> {
    const records = await db.scheduledAssetTransactions.where('assetId').equals(assetId).toArray();
    return records.map(record => this.toDomain(record));
  }

  async findActive(): Promise<ScheduledAssetTransaction[]> {
    const records = await db.scheduledAssetTransactions.filter(record => record.isActive).toArray();
    return records.map(record => this.toDomain(record));
  }

  async findDue(): Promise<ScheduledAssetTransaction[]> {
    const today = new Date();
    const records = await db.scheduledAssetTransactions
      .where('scheduledDate')
      .belowOrEqual(today)
      .and(record => record.isActive && !record.isExecuted)
      .toArray();
    return records.map(record => this.toDomain(record));
  }

  async save(scheduledTransaction: ScheduledAssetTransaction): Promise<ScheduledAssetTransaction> {
    const recordData = this.toRecord(scheduledTransaction);

    if (scheduledTransaction.id) {
      // Update existing
      await db.scheduledAssetTransactions.update(scheduledTransaction.id, recordData);
      return scheduledTransaction;
    } else {
      // Create new
      const newId = await db.scheduledAssetTransactions.add(recordData);
      return new ScheduledAssetTransaction(
        newId,
        scheduledTransaction.assetId,
        scheduledTransaction.transactionType,
        scheduledTransaction.quantity,
        scheduledTransaction.price,
        scheduledTransaction.scheduledDate,
        scheduledTransaction.frequency,
        scheduledTransaction.endDate,
        scheduledTransaction.totalOccurrences,
        scheduledTransaction.isActive,
        scheduledTransaction.isExecuted,
        scheduledTransaction.executedTransactionId
      );
    }
  }

  async saveMany(
    scheduledTransactions: ScheduledAssetTransaction[]
  ): Promise<ScheduledAssetTransaction[]> {
    const recordsData = scheduledTransactions.map(st => this.toRecord(st));
    const newIds = await db.scheduledAssetTransactions.bulkAdd(recordsData, { allKeys: true });

    return scheduledTransactions.map(
      (st, index) =>
        new ScheduledAssetTransaction(
          newIds[index] as number,
          st.assetId,
          st.transactionType,
          st.quantity,
          st.price,
          st.scheduledDate,
          st.frequency,
          st.endDate,
          st.totalOccurrences,
          st.isActive,
          st.isExecuted,
          st.executedTransactionId
        )
    );
  }

  async markAsExecuted(id: number, executedTransactionId: number): Promise<void> {
    await db.scheduledAssetTransactions.update(id, {
      isExecuted: true,
      executedTransactionId,
    });
  }

  async deactivate(id: number): Promise<void> {
    await db.scheduledAssetTransactions.update(id, {
      isActive: false,
    });
  }

  async delete(id: number): Promise<void> {
    await db.scheduledAssetTransactions.delete(id);
  }

  async deleteByAssetId(assetId: number): Promise<void> {
    await db.scheduledAssetTransactions.where('assetId').equals(assetId).delete();
  }
}
