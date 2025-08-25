import { IPaymentSchedule, PaymentSchedule } from '../../domain/entities/loans/PaymentSchedule';
import { db } from '../database';

export class LoanPaymentScheduleRepository {
  public async create(schedule: IPaymentSchedule): Promise<IPaymentSchedule> {
    return db.paymentSchedules.add(schedule).then(id => ({ ...schedule, id }));
  }

  public async update(schedule: IPaymentSchedule): Promise<IPaymentSchedule> {
    return db.paymentSchedules.update(schedule.id, schedule).then(() => schedule);
  }

  public async findByLoanId(loanId: number): Promise<PaymentSchedule[]> {
    return db.paymentSchedules.where('loanId').equals(loanId).toArray();
  }

  public async delete(id: number): Promise<void> {
    return db.paymentSchedules.delete(id);
  }

  public async deleteByLoanId(loanId: number): Promise<void> {
    await db.paymentSchedules.where('loanId').equals(loanId).delete();
  }
}
