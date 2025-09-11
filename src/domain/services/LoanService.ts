import { EMIRepository } from '@/data/repositories/loan/EMIRepository';
import { LoanRepository } from '@/data/repositories/loan/LoanRepository';
import { PaymentRepository } from '@/data/repositories/loan/PaymentRepository';
import { EMI, IEMI } from '../entities/loans/EMI';
import { ILoan, Loan } from '../entities/loans/Loan';
import { IPayment, Payment } from '../entities/loans/Payment';

export class LoanService {
  private readonly loanRepository: LoanRepository;
  private readonly emiRepository: EMIRepository;
  private readonly loanPaymentRepository: PaymentRepository;

  constructor() {
    this.loanRepository = new LoanRepository();
    this.emiRepository = new EMIRepository();
    this.loanPaymentRepository = new PaymentRepository();
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
    await this.emiRepository.deleteByLoanId(id);
    await this.loanPaymentRepository.deleteByLoanId(id);
  }

  async createPayment(payment: IPayment): Promise<Payment> {
    return this.loanPaymentRepository.create(payment);
  }

  async updatePayment(payment: IPayment): Promise<Payment> {
    return this.loanPaymentRepository.update(payment);
  }

  async deletePayment(id: number): Promise<void> {
    await this.loanPaymentRepository.delete(id);
  }

  async createEMI(emi: IEMI): Promise<EMI> {
    const createdSchedule = await this.emiRepository.create(emi);
    return new EMI(createdSchedule);
  }

  async updateEMI(emi: IEMI): Promise<EMI> {
    await this.loanPaymentRepository.deleteByEMIId(emi.id!);
    const updatedSchedule = await this.emiRepository.update(emi);
    return new EMI(updatedSchedule);
  }

  async getPaymentSchedulesByLoan(loanId: number): Promise<EMI[]> {
    const schedules = await this.emiRepository.findByLoanId(loanId);
    return schedules.map(schedule => new EMI(schedule));
  }

  async getPaymentsByLoan(loanId: number): Promise<Payment[]> {
    return this.loanPaymentRepository.getByLoanId(loanId);
  }

  async deletePaymentSchedule(id: number): Promise<void> {
    await this.loanPaymentRepository.deleteByEMIId(id);
    await this.emiRepository.delete(id);
  }

  async createEMIPayments(): Promise<void> {
    await this.emiRepository.getAll().then(async schedules => {
      for (const schedule of schedules) {
        const sch = new EMI(schedule);
        const pendingOccurrences = sch.getPendingOccurences(new Date());

        if (pendingOccurrences.length > 0) {
          // Create all payments for this schedule
          for (const occurrence of pendingOccurrences) {
            await this.loanPaymentRepository.create({
              id: undefined,
              loanId: occurrence.loanId,
              description: `Scheduled payment for loan ${occurrence.loanId}`,
              amount: occurrence.amount,
              date: occurrence.date,
            });
          }

          // Update the lastGeneratedDate to the latest payment date
          const latestPaymentDate = pendingOccurrences[pendingOccurrences.length - 1].date;
          await this.emiRepository.update({
            ...schedule,
            lastGeneratedDate: latestPaymentDate,
          });
        }
      }
    });
  }

  private async toLoan(data: ILoan): Promise<Loan> {
    const payments = await this.loanPaymentRepository.getByLoanId(data.id!);
    const emis = (await this.emiRepository.findByLoanId(data.id!)).map(
      schedule => new EMI(schedule)
    );
    return new Loan({
      ...data,
      payments,
      emis,
    });
  }
}
