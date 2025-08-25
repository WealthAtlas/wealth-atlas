import { IRRCalculator } from '../shared/IRRCalculator';
import { AssetPricingModel } from './AssetPricingModel';
import { AssetTransaction } from './AssetTransaction';
import { ScheduledAssetTransaction } from './ScheduledAssetTransaction';

export interface IAsset {
  id: number | undefined;
  name: string;
  description: string;
  category: string;
  currency: string;
  pricingModel: AssetPricingModel;
  //Interest rate model
  interestRate: number | undefined; // Annual interest rate as percentage (e.g., 7.5 for 7.5%)
  //Maturity date model
  maturityDate: Date | undefined; // Optional maturity date
  maturityAmount: number | undefined; // Fixed amount at maturity
  //Market value model
  marketValue: number | undefined;
  marketValueUpdatedAt: Date | undefined;
  apiPath: string | undefined; // API path to fetch current market value per unit
}

export class Asset implements IAsset {
  public readonly id: number | undefined;
  public readonly name: string;
  public readonly description: string;
  public readonly category: string;
  public readonly currency: string;
  public readonly pricingModel: AssetPricingModel;
  public readonly interestRate: number | undefined;
  public readonly maturityDate: Date | undefined;
  public readonly maturityAmount: number | undefined;
  public readonly marketValue: number | undefined;
  public readonly marketValueUpdatedAt: Date | undefined;
  public readonly apiPath: string | undefined;
  private readonly transactions: AssetTransaction[];
  private readonly sips: ScheduledAssetTransaction[];

  constructor({
    id,
    name,
    description,
    category,
    currency,
    pricingModel,
    interestRate,
    maturityDate,
    maturityAmount,
    marketValue,
    marketValueUpdatedAt,
    apiPath,
    transactions = [],
    sips = [],
  }: IAsset & { transactions: AssetTransaction[]; sips: ScheduledAssetTransaction[] }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.category = category;
    this.currency = currency;
    this.pricingModel = pricingModel;
    this.interestRate = interestRate;
    this.maturityDate = maturityDate;
    this.maturityAmount = maturityAmount;
    this.marketValue = marketValue;
    this.marketValueUpdatedAt = marketValueUpdatedAt;
    this.apiPath = apiPath;
    this.transactions = transactions;
    this.sips = sips;
  }

  // Business methods to compute portfolio metrics
  public getTotalInvestedAmount(transactions: AssetTransaction[]): number {
    return transactions
      .filter(t => t.assetId === this.id)
      .reduce((total, transaction) => {
        const amount = (transaction.quantity || 1) * transaction.price;
        return total + amount;
      }, 0);
  }

  public getCurrentHoldings(transactions: AssetTransaction[]): number {
    return transactions
      .filter(t => t.assetId === this.id)
      .reduce((total, transaction) => {
        const quantity = transaction.quantity || 1;
        return total + quantity;
      }, 0);
  }

  public getProfitLoss(transactions: AssetTransaction[]): number | undefined {
    if (!this.getValue()) return undefined;

    const totalInvested = this.getTotalInvestedAmount(transactions);
    const currentHoldings = this.getCurrentHoldings(transactions);
    const currentTotalValue = currentHoldings * this.getValue()!;

    return currentTotalValue - totalInvested;
  }

  public getValue(): number | undefined {
    return this.getValueOn(new Date());
  }

  public getValueOn(date: Date): number | undefined {
    switch (this.pricingModel) {
      case AssetPricingModel.MARKET_BASED:
        return this.marketValue;
      case AssetPricingModel.FIXED_INCOME:
        const fixedIncomeEffectiveDate =
          this.maturityDate && date > this.maturityDate ? this.maturityDate : date;
        return IRRCalculator.getInstance().calculateFutureValueOnIRR(
          this.transactions.map(tx => ({ date: tx.date, amount: tx.getTotalAmount() })),
          this.interestRate!,
          fixedIncomeEffectiveDate
        );
      case AssetPricingModel.MATURITY_BASED:
        const maturityIRR = IRRCalculator.getInstance().calculateIRR({
          transactions: this.transactions.map(tx => ({
            date: tx.date,
            amount: tx.getTotalAmount(),
          })),
          value: this.maturityAmount!,
          valueUpdatedOn: this.maturityDate!,
        });
        const maturityBasedEffectiveDate =
          this.maturityDate && date > this.maturityDate ? this.maturityDate : date;
        return IRRCalculator.getInstance().calculateFutureValueOnIRR(
          this.transactions.map(tx => ({ date: tx.date, amount: tx.getTotalAmount() })),
          maturityIRR,
          maturityBasedEffectiveDate
        );
      default:
        return undefined;
    }
  }

  public getTransactions(till: Date, considerFutureTransactions: boolean): AssetTransaction[] {
    let allTransactions = this.transactions.filter(t => t.date <= till);
    if (considerFutureTransactions) {
      const futureTransactions = this.sips.map(sip => sip.getFuturePayments(till)).flat();
      allTransactions = allTransactions.concat(futureTransactions);
    }
    return allTransactions;
  }

  public getIRR(till: Date): number | undefined {
    return IRRCalculator.getInstance().calculateIRR({
      transactions: this.getTransactions(till, true).map(tx => ({
        date: tx.date,
        amount: tx.getTotalAmount(),
      })),
      value: this.getValueOn(till)!,
      valueUpdatedOn: till,
    });
  }
}
