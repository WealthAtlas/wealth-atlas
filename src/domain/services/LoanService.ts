import { LoanPaymentRepository } from '../../data/repositories/loan/LoanPaymentRepository';
import { LoanPaymentScheduleRepository } from '../../data/repositories/loan/LoanPaymentScheduleRepository';
import { LoanRepository } from '../../data/repositories/loan/LoanRepository';
import { ILoan, Loan } from '../entities/loans/Loan';
import { ILoanPayment, LoanPayment } from '../entities/loans/LoanPayment';
import { IPaymentSchedule, PaymentSchedule } from '../entities/loans/PaymentSchedule';

export class LoanService {
  private readonly loanRepository: LoanRepository;
  private readonly paymentScheduleRepository: LoanPaymentScheduleRepository;
  private readonly loanPaymentRepository: LoanPaymentRepository;

  constructor() {
    this.loanRepository = new LoanRepository();
    this.paymentScheduleRepository = new LoanPaymentScheduleRepository();
    this.loanPaymentRepository = new LoanPaymentRepository();
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

  async deleteLoan(id: number): Promise<void> {
    await this.loanRepository.delete(id);
    await this.paymentScheduleRepository.deleteByLoanId(id);
    await this.loanPaymentRepository.deleteByLoanId(id);
  }

  async createPayment(payment: ILoanPayment): Promise<LoanPayment> {
    return this.loanPaymentRepository.create(payment);
  }

  async updatePayment(payment: ILoanPayment): Promise<LoanPayment> {
    return this.loanPaymentRepository.update(payment);
  }

  async deletePayment(id: number): Promise<void> {
    await this.loanPaymentRepository.delete(id);
  }

  async createPaymentSchedule(schedule: IPaymentSchedule): Promise<PaymentSchedule> {
    const createdSchedule = await this.paymentScheduleRepository.create(schedule);
    return new PaymentSchedule(createdSchedule);
  }

  async updatePaymentSchedule(schedule: IPaymentSchedule): Promise<PaymentSchedule> {
    const updatedSchedule = await this.paymentScheduleRepository.update(schedule);
    return new PaymentSchedule(updatedSchedule);
  }

  async getPaymentSchedulesByLoan(loanId: number): Promise<PaymentSchedule[]> {
    const schedules = await this.paymentScheduleRepository.findByLoanId(loanId);
    return schedules.map(schedule => new PaymentSchedule(schedule));
  }

  async getPaymentsByLoan(loanId: number): Promise<LoanPayment[]> {
    return this.loanPaymentRepository.getByLoanId(loanId);
  }

  async deletePaymentSchedule(id: number): Promise<void> {
    await this.paymentScheduleRepository.delete(id);
  }

  async createScheduledLoanPayments(): Promise<void> {
    await this.paymentScheduleRepository.getAll().then(async schedules => {
      for (const schedule of schedules) {
        const sch = new PaymentSchedule(schedule);
        sch.getPendingOccurences(new Date()).forEach(async occurrence => {
          await this.loanPaymentRepository.create({
            id: undefined,
            loanId: occurrence.loanId,
            description: `Scheduled payment for loan ${occurrence.loanId}`,
            amount: occurrence.amount,
            date: occurrence.date,
          });
        });
      }
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
