import { PaymentFrequency } from '../../domain/entities/PaymentFrequency';
import { IPaymentSchedule, PaymentSchedule } from '../../domain/entities/PaymentSchedule';
import { db } from '../database';

export class PaymentScheduleRepository {
  // Private mapping methods for DRY principle
  private toDomain(record: IPaymentSchedule): PaymentSchedule {
    return new PaymentSchedule(
      record.id,
      record.loanId,
      record.name,
      record.amount,
      record.frequency as PaymentFrequency, // Ensure it's treated as enum
      record.startDate,
      record.endDate,
      record.lastGeneratedDate
    );
  }

  private toRecord(schedule: PaymentSchedule): Omit<IPaymentSchedule, 'id'> {
    return {
      loanId: schedule.loanId,
      name: schedule.name,
      amount: schedule.amount,
      frequency: schedule.frequency,
      startDate: schedule.startDate,
      endDate: schedule.endDate,
      lastGeneratedDate: schedule.lastGeneratedDate,
    };
  }

  // Standard CRUD operations
  async findAll(): Promise<PaymentSchedule[]> {
    const records = await db.paymentSchedules.toArray();
    return records.map(record => this.toDomain(record));
  }

  async findById(id: number): Promise<PaymentSchedule | null> {
    const record = await db.paymentSchedules.get(id);
    return record ? this.toDomain(record) : null;
  }

  async findByLoanId(loanId: number): Promise<PaymentSchedule[]> {
    const records = await db.paymentSchedules.where('loanId').equals(loanId).toArray();
    return records.map(record => this.toDomain(record));
  }

  async save(schedule: PaymentSchedule): Promise<PaymentSchedule> {
    const record = this.toRecord(schedule);

    if (schedule.id) {
      // Update existing schedule
      await db.paymentSchedules.update(schedule.id, record);
      return schedule;
    } else {
      // Create new schedule
      const id = await db.paymentSchedules.add(record);
      return new PaymentSchedule(
        id,
        schedule.loanId,
        schedule.name,
        schedule.amount,
        schedule.frequency,
        schedule.startDate,
        schedule.endDate,
        schedule.lastGeneratedDate
      );
    }
  }

  async delete(id: number): Promise<void> {
    await db.paymentSchedules.delete(id);
  }

  async deleteByLoanId(loanId: number): Promise<void> {
    await db.paymentSchedules.where('loanId').equals(loanId).delete();
  }

  // Update last generated date for a schedule
  async updateLastGeneratedDate(id: number, date: Date): Promise<void> {
    await db.paymentSchedules.update(id, { lastGeneratedDate: date });
  }

  // Find active schedules (where current date is between start and end dates)
  async findActiveSchedules(): Promise<PaymentSchedule[]> {
    const today = new Date();
    const allSchedules = await this.findAll();

    return allSchedules.filter(
      schedule => schedule.startDate <= today && schedule.endDate >= today
    );
  }
}
