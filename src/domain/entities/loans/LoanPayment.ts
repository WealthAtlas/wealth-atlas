export interface ILoanPayment {
  id?: number;
  loanId: number;
  date: Date;
  amount: number;
  isPaid: boolean;
  description?: string;
}

export class LoanPayment implements ILoanPayment {
  constructor(
    public readonly id: number | undefined,
    public readonly loanId: number,
    public readonly date: Date,
    public readonly amount: number,
    public readonly isPaid: boolean,
    public readonly description?: string
  ) {
    this.validatePayment();
  }

  private validatePayment(): void {
    if (this.loanId <= 0) {
      throw new Error('Valid loan ID is required');
    }
    if (this.amount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }
    if (!this.date) {
      throw new Error('Payment date is required');
    }
  }

  // Business methods
  isOverdue(): boolean {
    if (this.isPaid) return false;
    return new Date() > this.date;
  }

  getDaysOverdue(): number {
    if (this.isPaid || !this.isOverdue()) return 0;

    const today = new Date();
    const diffTime = today.getTime() - this.date.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }

  markAsPaid(): LoanPayment {
    return new LoanPayment(this.id, this.loanId, this.date, this.amount, true, this.description);
  }

  updateAmount(newAmount: number): LoanPayment {
    if (newAmount <= 0) {
      throw new Error('Payment amount must be greater than zero');
    }

    return new LoanPayment(
      this.id,
      this.loanId,
      this.date,
      newAmount,
      this.isPaid,
      this.description
    );
  }
}
