import { ILoan } from '../../domain/entities/loans/Loan';
import { db } from '../database';

export class LoanRepository {
  async create(loan: ILoan): Promise<ILoan> {
    const id = await db.loans.add(loan);
    return { ...loan, id };
  }

  async getAll(): Promise<ILoan[]> {
    return await db.loans.toArray();
  }

  async getById(id: number): Promise<ILoan> {
    return (await db.loans.get(id)) ?? Promise.reject(new Error('Loan not found'));
  }

  async update(updates: ILoan): Promise<ILoan> {
    await db.loans.update(updates.id, updates);
    return { ...updates };
  }

  async delete(id: number): Promise<void> {
    await db.loans.delete(id);
  }
}
