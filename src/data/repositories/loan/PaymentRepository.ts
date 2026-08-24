import { IPayment } from '../../../domain/entities/loans/Payment';
import { db } from '../../database';
import { deleteSynced } from '../../sync/merge/Tombstones';

export class PaymentRepository {
  async create(loanPayment: IPayment): Promise<IPayment> {
    const id = await db.payments.add(loanPayment);
    return { ...loanPayment, id };
  }

  async getAll(): Promise<IPayment[]> {
    return await db.payments.toArray();
  }

  async getById(id: number): Promise<IPayment> {
    return (await db.payments.get(id))!;
  }

  async getByLoanId(loanId: number): Promise<IPayment[]> {
    return await db.payments.where({ loanId }).toArray();
  }

  async update(updates: IPayment): Promise<IPayment> {
    await db.payments.update(updates.id, updates);
    return { ...updates };
  }

  async delete(id: number): Promise<void> {
    await deleteSynced('payments', [id]);
  }

  async deleteByLoanId(loanId: number): Promise<void> {
    // Read then delete, rather than a collection delete: a tombstone needs each
    // row's identity, which is only knowable before the row is gone.
    const rows = await db.payments.where({ loanId }).toArray();
    await deleteSynced(
      'payments',
      rows.map(row => row.id)
    );
  }

  async deleteByEMIId(emiId: number): Promise<void> {
    const rows = await db.payments.where({ emiId }).toArray();
    await deleteSynced(
      'payments',
      rows.map(row => row.id)
    );
  }
}
