import { ILoan, Loan } from '../../domain/entities/loans/Loan';
import { db } from '../database';

export class LoanRepository {
  // Private mapping methods for DRY principle
  private toDomain(record: ILoan): Loan {
    return new Loan(
      record.id,
      record.name,
      record.lenderName,
      record.principalAmount,
      record.currency,
      record.startDate,
      record.description
    );
  }

  private toRecord(loan: Loan): Omit<ILoan, 'id'> {
    return {
      name: loan.name,
      lenderName: loan.lenderName,
      principalAmount: loan.principalAmount,
      currency: loan.currency,
      startDate: loan.startDate,
      description: loan.description,
    };
  }

  // Standard CRUD operations
  async findAll(): Promise<Loan[]> {
    const records = await db.loans.toArray();
    return records.map(record => this.toDomain(record));
  }

  async findById(id: number): Promise<Loan | null> {
    const record = await db.loans.get(id);
    return record ? this.toDomain(record) : null;
  }

  async save(loan: Loan): Promise<Loan> {
    const record = this.toRecord(loan);

    if (loan.id) {
      // Update existing loan
      await db.loans.update(loan.id, record);
      return loan;
    } else {
      // Create new loan
      const id = await db.loans.add(record);
      return new Loan(
        id,
        loan.name,
        loan.lenderName,
        loan.principalAmount,
        loan.currency,
        loan.startDate,
        loan.description
      );
    }
  }

  async delete(id: number): Promise<void> {
    await db.loans.delete(id);
  }

  // Find loans by currency
  async findByCurrency(currency: string): Promise<Loan[]> {
    const records = await db.loans.where('currency').equals(currency).toArray();
    return records.map(record => this.toDomain(record));
  }

  // Find loans by lender
  async findByLender(lenderName: string): Promise<Loan[]> {
    const records = await db.loans.where('lenderName').equals(lenderName).toArray();
    return records.map(record => this.toDomain(record));
  }
}
