import { IEMI } from '../../../domain/entities/loans/EMI';
import { db } from '../../database';
import { deleteSynced } from '../../sync/merge/Tombstones';

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
    await deleteSynced('emis', [id]);
  }

  public async deleteByLoanId(loanId: number): Promise<void> {
    const rows = await db.emis.where('loanId').equals(loanId).toArray();
    await deleteSynced(
      'emis',
      rows.map(row => row.id)
    );
  }
}
