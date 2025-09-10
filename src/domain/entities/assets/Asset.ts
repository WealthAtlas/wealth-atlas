import { IRRCalculator } from '../shared/IRRCalculator';
import { Investment } from './Investment';
import { SIP } from './SIP';
import { ValueModel } from './ValueModel';

export interface IAsset {
  id: number | undefined;
  name: string;
  description: string;
  category: string;
  currency: string;
  valueModel: ValueModel;
  //Interest rate model
  interestRate: number | undefined; // Annual interest rate as percentage (e.g., 7.5 for 7.5%)
  //Maturity date model
  maturityDate: Date | undefined; // Optional maturity date
  maturityAmount: number | undefined; // Fixed amount at maturity
  //Market value model
  marketValue: number | undefined;
  marketValueUpdatedAt: Date | undefined;
  script: string | undefined;
}

export class Asset implements IAsset {
  public readonly id: number | undefined;
  public readonly name: string;
  public readonly description: string;
  public readonly category: string;
  public readonly currency: string;
  public readonly valueModel: ValueModel;
  public readonly interestRate: number | undefined;
  public readonly maturityDate: Date | undefined;
  public readonly maturityAmount: number | undefined;
  public readonly marketValue: number | undefined;
  public readonly marketValueUpdatedAt: Date | undefined;
  public readonly script: string | undefined;
  private readonly investments: Investment[];
  private readonly sips: SIP[];

  constructor({
    id,
    name,
    description,
    category,
    currency,
    valueModel,
    interestRate,
    maturityDate,
    maturityAmount,
    marketValue,
    marketValueUpdatedAt,
    script,
    investments: investments = [],
    sips = [],
  }: IAsset & { investments: Investment[]; sips: SIP[] }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.category = category;
    this.currency = currency;
    this.valueModel = valueModel;
    this.interestRate = interestRate;
    this.maturityDate = maturityDate ? new Date(maturityDate) : undefined;
    this.maturityAmount = maturityAmount;
    this.marketValue = marketValue;
    this.marketValueUpdatedAt = marketValueUpdatedAt ? new Date(marketValueUpdatedAt) : undefined;
    this.script = script;
    this.investments = investments;
    this.sips = sips;
  }

  // Business methods to compute portfolio metrics
  public getTotalInvestedAmount(till?: Date, includeFuture: boolean = false): number {
    const investments = this.getInvestments(till ?? new Date(), includeFuture);
    return investments
      .filter(tx => (till ? tx.date <= till : true))
      .reduce((total, transaction) => {
        const amount = transaction.getTotalAmount();
        return total + amount;
      }, 0);
  }

  public getTotalQty(till?: Date, includeFuture: boolean = false): number {
    const investments = this.getInvestments(till ?? new Date(), includeFuture);
    return investments
      .filter(tx => (till ? tx.date <= till : true))
      .reduce((total, transaction) => {
        const quantity = transaction.quantity;
        if (quantity === undefined) return total;
        return total + quantity;
      }, 0);
  }

  public getCurrentHoldings(): number | undefined {
    const holding = this.investments.reduce((total, transaction) => {
      const quantity = transaction.quantity;
      if (quantity === undefined) return total;
      return total + quantity;
    }, 0);
    return holding < 1 ? undefined : holding;
  }

  public getProfitLoss(): number | undefined {
    if (!this.getValue()) return undefined;

    const totalInvested = this.getTotalInvestedAmount();
    const currentTotalValue = this.getValue()!;

    return currentTotalValue - totalInvested;
  }

  public getValue(): number | undefined {
    return this.getValueOn(new Date());
  }

  public getWeightedValueOn(date: Date): number | undefined {
    const currentValue = this.getValueOn(date);
    if (currentValue === undefined) return undefined;

    const totalQty = this.getTotalQty();
    const currentQty = this.getTotalQty(date);

    if (totalQty && currentQty) {
      return (currentQty / totalQty) * currentValue;
    }

    // Fallback to invested amount based weighting
    const totalInvested = this.getTotalInvestedAmount();
    if (totalInvested === 0) return undefined;

    const currentInvested = this.getTotalInvestedAmount(date);
    return (currentInvested / totalInvested) * currentValue;
  }

  public getValueOn(date: Date): number | undefined {
    switch (this.valueModel) {
      case ValueModel.MARKET_BASED:
        return this.marketValue;
      case ValueModel.FIXED_INCOME: {
        const fixedIncomeEffectiveDate =
          this.maturityDate && date > this.maturityDate ? this.maturityDate : date;
        return IRRCalculator.getInstance().calculateFutureValueOnIRR(
          this.investments.map(tx => ({ date: tx.date, amount: tx.getTotalAmount() })),
          this.interestRate!,
          fixedIncomeEffectiveDate
        );
      }
      case ValueModel.MATURITY_BASED: {
        const maturityIRR = IRRCalculator.getInstance().calculateIRR({
          transactions: this.investments.map(tx => ({
            date: tx.date,
            amount: tx.getTotalAmount(),
          })),
          value: this.maturityAmount!,
          valueUpdatedOn: this.maturityDate!,
        });
        const maturityBasedEffectiveDate =
          this.maturityDate && date > this.maturityDate ? this.maturityDate : date;
        return IRRCalculator.getInstance().calculateFutureValueOnIRR(
          this.investments.map(tx => ({ date: tx.date, amount: tx.getTotalAmount() })),
          maturityIRR,
          maturityBasedEffectiveDate
        );
      }
      default:
        return undefined;
    }
  }

  public getInvestments(till: Date, considerFutureTransactions: boolean): Investment[] {
    let allTransactions = this.investments.filter(t => t.date <= till);
    if (considerFutureTransactions) {
      const futureTransactions = this.sips.map(sip => sip.getPendingOccurences(till)).flat();
      allTransactions = allTransactions.concat(futureTransactions);
    }
    return allTransactions;
  }

  public getIRR(till: Date): number | undefined {
    return IRRCalculator.getInstance().calculateIRR({
      transactions: this.getInvestments(till, true).map(tx => ({
        date: tx.date,
        amount: tx.getTotalAmount(),
      })),
      value: this.getValueOn(till)!,
      valueUpdatedOn: till,
    });
  }
}
