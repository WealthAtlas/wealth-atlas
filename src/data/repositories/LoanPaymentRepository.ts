import { ILoanPayment, LoanPayment } from '../../domain/entities/LoanPayment';
import { db } from '../database';

export class LoanPaymentRepository {
  // Private mapping methods for DRY principle
  private toDomain(record: ILoanPayment): LoanPayment {
    return new LoanPayment(
      record.id,
      record.loanId,
      record.date,
      record.amount,
      record.isPaid,
      record.description
    );
  }

  private toRecord(payment: LoanPayment): Omit<ILoanPayment, 'id'> {
    return {
      loanId: payment.loanId,
      date: payment.date,
      amount: payment.amount,
      isPaid: payment.isPaid,
      description: payment.description,
    };
  }

  // Standard CRUD operations
  async findAll(): Promise<LoanPayment[]> {
    const records = await db.loanPayments.toArray();
    return records.map(record => this.toDomain(record));
  }

  async findById(id: number): Promise<LoanPayment | null> {
    const record = await db.loanPayments.get(id);
    return record ? this.toDomain(record) : null;
  }

  async findByLoanId(loanId: number): Promise<LoanPayment[]> {
    const records = await db.loanPayments.where('loanId').equals(loanId).sortBy('date');
    return records.map(record => this.toDomain(record));
  }

  async save(payment: LoanPayment): Promise<LoanPayment> {
    const record = this.toRecord(payment);

    if (payment.id) {
      // Update existing payment
      await db.loanPayments.update(payment.id, record);
      return payment;
    } else {
      // Create new payment
      const id = await db.loanPayments.add(record);
      return new LoanPayment(
        id,
        payment.loanId,
        payment.date,
        payment.amount,
        payment.isPaid,
        payment.description
      );
    }
  }

  async saveMultiple(payments: LoanPayment[]): Promise<LoanPayment[]> {
    const savedPayments: LoanPayment[] = [];

    for (const payment of payments) {
      const saved = await this.save(payment);
      savedPayments.push(saved);
    }

    return savedPayments;
  }

  async delete(id: number): Promise<void> {
    await db.loanPayments.delete(id);
  }

  async deleteByLoanId(loanId: number): Promise<void> {
    await db.loanPayments.where('loanId').equals(loanId).delete();
  }

  // Find payments by date range
  async findByDateRange(loanId: number, startDate: Date, endDate: Date): Promise<LoanPayment[]> {
    const records = await db.loanPayments
      .where('loanId')
      .equals(loanId)
      .and(payment => payment.date >= startDate && payment.date <= endDate)
      .sortBy('date');

    return records.map(record => this.toDomain(record));
  }

  // Find overdue payments
  async findOverduePayments(): Promise<LoanPayment[]> {
    const today = new Date();
    const allPayments = await this.findAll();

    return allPayments
      .filter(payment => !payment.isPaid && payment.date < today)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  // Find paid payments
  async findPaidPayments(loanId: number): Promise<LoanPayment[]> {
    const loanPayments = await this.findByLoanId(loanId);
    return loanPayments.filter(payment => payment.isPaid);
  }

  // Find upcoming payments (unpaid payments in the future)
  async findUpcomingPayments(loanId: number, daysAhead: number = 30): Promise<LoanPayment[]> {
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysAhead);

    const loanPayments = await this.findByLoanId(loanId);

    return loanPayments.filter(
      payment => !payment.isPaid && payment.date >= today && payment.date <= futureDate
    );
  }

  // Mark payment as paid
  async markAsPaid(id: number): Promise<void> {
    await db.loanPayments.update(id, { isPaid: true });
  }

  // Update payment amount
  async updateAmount(id: number, amount: number): Promise<void> {
    if (amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }
    await db.loanPayments.update(id, { amount });
  }
}
