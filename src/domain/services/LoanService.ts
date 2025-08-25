import { LoanPaymentRepository } from '../../data/repositories/loan/LoanPaymentRepository';
import { LoanPaymentScheduleRepository } from '../../data/repositories/loan/LoanPaymentScheduleRepository';
import { LoanRepository } from '../../data/repositories/loan/LoanRepository';
import { ILoan, Loan } from '../entities/loans/Loan';
import { PaymentSchedule } from '../entities/loans/PaymentSchedule';

export class LoanService {
  constructor(
    private loanRepository: LoanRepository,
    private paymentScheduleRepository: LoanPaymentScheduleRepository,
    private loanPaymentRepository: LoanPaymentRepository
  ) {}

  async deleteLoan(id: number): Promise<void> {
    await this.loanRepository.delete(id);
    await this.paymentScheduleRepository.deleteByLoanId(id);
    await this.loanPaymentRepository.deleteByLoanId(id);
  }

  async getLoans(): Promise<Loan[]> {
    return this.loanRepository.getAll().then(async loans => {
      return Promise.all(
        loans.map(async loan => {
          return this.toLoan(loan);
        })
      );
    });
  }

  async getLoan(id: number): Promise<Loan> {
    return this.loanRepository.getById(id).then(async loan => {
      return this.toLoan(loan);
    });
  }

  async createLoan(loan: Loan): Promise<Loan> {
    return this.loanRepository.create(loan).then(createdLoan => {
      return this.toLoan(createdLoan);
    });
  }

  async updateLoan(loan: Loan): Promise<Loan> {
    return this.loanRepository.update(loan).then(async updatedLoan => {
      return this.toLoan(updatedLoan);
    });
  }

  private async toLoan(data: ILoan): Promise<Loan> {
    const payments = await this.loanPaymentRepository.getByLoanId(data.id!);
    const paymentSchedules = (await this.paymentScheduleRepository.findByLoanId(data.id!)).map(
      schedule => new PaymentSchedule(schedule)
    );
    return new Loan({
      ...data,
      payments,
      paymentSchedules,
    });
  }
}
