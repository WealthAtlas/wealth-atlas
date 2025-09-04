export interface IPayment {
  id: number | undefined;
  loanId: number;
  description: string;
  date: Date;
  amount: number;
}

export class Payment implements IPayment {
  public readonly id: number | undefined;
  public readonly loanId: number;
  public readonly description: string;
  public readonly date: Date;
  public readonly amount: number;

  constructor({ id, loanId, date, amount, description }: IPayment) {
    this.id = id;
    this.loanId = loanId;
    this.date = date;
    this.amount = amount;
    this.description = description;
  }
}
