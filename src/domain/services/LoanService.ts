import { LoanPaymentRepository } from '../../data/repositories/LoanPaymentRepository';
import { LoanPaymentScheduleRepository } from '../../data/repositories/LoanPaymentScheduleRepository';
import { LoanRepository } from '../../data/repositories/LoanRepository';
import { Loan } from '../entities/loans/Loan';

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
          return new Loan({
            ...loan,
            payments: await this.loanPaymentRepository.getByLoanId(loan.id!),
            paymentSchedules: await this.paymentScheduleRepository.findByLoanId(loan.id!),
          });
        })
      );
    });
  }

  async getLoan(id: number): Promise<Loan> {
    return this.loanRepository.getById(id).then(async loan => {
      return new Loan({
        ...loan,
        payments: await this.loanPaymentRepository.getByLoanId(loan.id!),
        paymentSchedules: await this.paymentScheduleRepository.findByLoanId(loan.id!),
      });
    });
  }

  async createLoan(loan: Loan): Promise<Loan> {
    return this.loanRepository.create(loan).then(createdLoan => {
      return new Loan({ ...createdLoan, payments: [], paymentSchedules: [] });
    });
  }

  async updateLoan(loan: Loan): Promise<Loan> {
    return this.loanRepository.update(loan).then(async updatedLoan => {
      return new Loan({
        ...updatedLoan,
        payments: await this.loanPaymentRepository.getByLoanId(updatedLoan.id!),
        paymentSchedules: await this.paymentScheduleRepository.findByLoanId(updatedLoan.id!),
      });
    });
  }
}
