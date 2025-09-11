import { IPayment } from '../../../domain/entities/loans/Payment';
import { db } from '../../database';

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
    await db.payments.delete(id);
  }

  async deleteByLoanId(loanId: number): Promise<void> {
    await db.payments.where({ loanId }).delete();
  }

  async deleteByEMIId(emiId: number): Promise<void> {
    await db.payments.where({ emiId }).delete();
  }
}
