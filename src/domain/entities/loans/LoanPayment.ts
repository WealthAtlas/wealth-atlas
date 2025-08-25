export interface ILoanPayment {
  id: number | undefined;
  loanId: number;
  description: string;
  date: Date;
  amount: number;
}

export class LoanPayment implements ILoanPayment {
  public readonly id: number | undefined;
  public readonly loanId: number;
  public readonly description: string;
  public readonly date: Date;
  public readonly amount: number;

  constructor({ id, loanId, date, amount, description }: ILoanPayment) {
    this.id = id;
    this.loanId = loanId;
    this.date = date;
    this.amount = amount;
    this.description = description;
  }
}
