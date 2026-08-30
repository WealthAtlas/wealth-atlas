import { IEMI } from '../../../domain/entities/loans/EMI';
import { db } from '../../database';

export class EMIRepository {
  public async create(emi: IEMI): Promise<IEMI> {
    return db.emis.add(emi).then(id => ({ ...emi, id }));
  }

  public async update(emi: IEMI): Promise<IEMI> {
    return db.emis.update(emi.id, emi).then(() => emi);
  }

  public async findByLoanId(loanId: number): Promise<IEMI[]> {
    return db.emis.where('loanId').equals(loanId).toArray();
  }

  public async getAll(): Promise<IEMI[]> {
    return db.emis.toArray();
  }

  public async delete(id: number): Promise<void> {
    await db.emis.delete(id);
  }

  public async deleteByLoanId(loanId: number): Promise<void> {
    await db.emis.where('loanId').equals(loanId).delete();
  }
}
