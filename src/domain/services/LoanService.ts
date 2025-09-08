import { LoanPaymentScheduleRepository } from '@/data/repositories/loan/EMIRepository';
import { LoanRepository } from '@/data/repositories/loan/LoanRepository';
import { LoanPaymentRepository } from '@/data/repositories/loan/PaymentRepository';
import { EMI, IEMI } from '../entities/loans/EMI';
import { ILoan, Loan } from '../entities/loans/Loan';
import { IPayment, Payment } from '../entities/loans/Payment';

export interface LoanSummary {
  loan: Loan;
  remainingBalance: number;
  totalPaid: number;
  totalInterestPaid: number;
  nextPaymentDate?: Date;
  isFullyPaid: boolean;
  overduePayments: Payment[];
}

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

  async createPayment(payment: IPayment): Promise<Payment> {
    return this.loanPaymentRepository.create(payment);
  }

  async updatePayment(payment: IPayment): Promise<Payment> {
    return this.loanPaymentRepository.update(payment);
  }

  async deletePayment(id: number): Promise<void> {
    await this.loanPaymentRepository.delete(id);
  }

  async createPaymentSchedule(schedule: IEMI): Promise<EMI> {
    const createdSchedule = await this.paymentScheduleRepository.create(schedule);
    return new EMI(createdSchedule);
  }

  async updatePaymentSchedule(schedule: IEMI): Promise<EMI> {
    const updatedSchedule = await this.paymentScheduleRepository.update(schedule);
    return new EMI(updatedSchedule);
  }

  async getPaymentSchedulesByLoan(loanId: number): Promise<EMI[]> {
    const schedules = await this.paymentScheduleRepository.findByLoanId(loanId);
    return schedules.map(schedule => new EMI(schedule));
  }

  async getPaymentsByLoan(loanId: number): Promise<Payment[]> {
    return this.loanPaymentRepository.getByLoanId(loanId);
  }

  async deletePaymentSchedule(id: number): Promise<void> {
    await this.paymentScheduleRepository.delete(id);
  }

  async createScheduledLoanPayments(): Promise<void> {
    await this.paymentScheduleRepository.getAll().then(async schedules => {
      for (const schedule of schedules) {
        const sch = new EMI(schedule);
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

  async getAllLoanSummaries(): Promise<LoanSummary[]> {
    const loans = await this.getLoans();

    return loans.map(loan => {
      const totalPaid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0);
      const remainingBalance = loan.principalAmount - totalPaid;
      const totalInterestPaid = loan.payments.reduce((sum, payment) => sum + payment.amount, 0); // Placeholder for actual interest calculation
      const nextPaymentDate = loan.emis
        .flatMap(schedule => schedule.getPendingOccurences())
        .map(occurrence => occurrence.date)
        .sort()[0];
      const overduePayments = loan.payments.filter(payment => payment.date < new Date());

      return {
        loan,
        remainingBalance,
        totalPaid,
        totalInterestPaid,
        nextPaymentDate,
        isFullyPaid: remainingBalance <= 0,
        overduePayments,
      };
    });
  }

  private async toLoan(data: ILoan): Promise<Loan> {
    const payments = await this.loanPaymentRepository.getByLoanId(data.id!);
    const emis = (await this.paymentScheduleRepository.findByLoanId(data.id!)).map(
      schedule => new EMI(schedule)
    );
    return new Loan({
      ...data,
      payments,
      emis,
    });
  }
}
