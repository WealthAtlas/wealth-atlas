import { IEMI } from '../../../domain/entities/loans/EMI';
import { db } from '../../database';

export class LoanPaymentScheduleRepository {
  public async create(schedule: IEMI): Promise<IEMI> {
    return db.emis.add(schedule).then(id => ({ ...schedule, id }));
  }

  public async update(schedule: IEMI): Promise<IEMI> {
    return db.emis.update(schedule.id, schedule).then(() => schedule);
  }

  public async findByLoanId(loanId: number): Promise<IEMI[]> {
    return db.emis.where('loanId').equals(loanId).toArray();
  }

  public async getAll(): Promise<IEMI[]> {
    return db.emis.toArray();
  }

  public async delete(id: number): Promise<void> {
    return db.emis.delete(id);
  }

  public async deleteByLoanId(loanId: number): Promise<void> {
    await db.emis.where('loanId').equals(loanId).delete();
  }
}
