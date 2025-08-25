import { ILoanPayment } from '../../../domain/entities/loans/LoanPayment';
import { db } from '../../database';

export class LoanPaymentRepository {
  async create(loanPayment: ILoanPayment): Promise<ILoanPayment> {
    const id = await db.loanPayments.add(loanPayment);
    return { ...loanPayment, id };
  }

  async getAll(): Promise<ILoanPayment[]> {
    return await db.loanPayments.toArray();
  }

  async getById(id: number): Promise<ILoanPayment> {
    return (await db.loanPayments.get(id)) ?? Promise.reject(new Error('LoanPayment not found'));
  }

  async getByLoanId(loanId: number): Promise<ILoanPayment[]> {
    return await db.loanPayments.where({ loanId }).toArray();
  }

  async update(updates: ILoanPayment): Promise<ILoanPayment> {
    await db.loanPayments.update(updates.id, updates);
    return { ...updates };
  }

  async delete(id: number): Promise<void> {
    await db.loanPayments.delete(id);
  }

  async deleteByLoanId(loanId: number): Promise<void> {
    await db.loanPayments.where({ loanId }).delete();
  }
}
