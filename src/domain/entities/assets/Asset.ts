import { Currency } from '../shared/Currency';
import { IRRCalculator } from '../shared/IRRCalculator';
import { Investment } from './Investment';
import { SIP } from './SIP';
import { ValueModel } from './ValueModel';
import { utcDay } from '../../utils/DateUtils';

export interface IAsset {
  id: number | undefined;
  name: string;
  description: string;
  category: string;
  currency: Currency;
  valueModel: ValueModel;
  //Interest rate model
  interestRate: number | undefined; // Annual interest rate as percentage (e.g., 7.5 for 7.5%)
  //Maturity date model
  maturityDate: Date | undefined; // Optional maturity date
  maturityAmount: number | undefined; // Fixed amount at maturity
  //Market value model
  manualValue: number | undefined;
  manualValueUpdatedAt: Date | undefined;
  script: string | undefined;
  scriptValue: number | undefined; // Value calculated from script execution
  scriptValueUpdatedAt: Date | undefined;
}

export class Asset implements IAsset {
  public readonly id: number | undefined;
  public readonly name: string;
  public readonly description: string;
  public readonly category: string;
  public readonly currency: Currency;
  public readonly valueModel: ValueModel;
  public readonly interestRate: number | undefined;
  public readonly maturityDate: Date | undefined;
  public readonly maturityAmount: number | undefined;
  public readonly manualValue: number | undefined;
  public readonly manualValueUpdatedAt: Date | undefined;
  public readonly script: string | undefined;
  public readonly scriptValue: number | undefined;
  public readonly scriptValueUpdatedAt: Date | undefined;
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
    manualValue,
    manualValueUpdatedAt,
    script,
    scriptValue,
    scriptValueUpdatedAt,
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
    this.maturityDate = maturityDate ? utcDay(maturityDate) : undefined;
    this.maturityAmount = maturityAmount;
    this.manualValue = manualValue;
    this.manualValueUpdatedAt = manualValueUpdatedAt ? new Date(manualValueUpdatedAt) : undefined;
    this.script = script;
    this.scriptValue = scriptValue;
    this.scriptValueUpdatedAt = scriptValueUpdatedAt ? new Date(scriptValueUpdatedAt) : undefined;
    this.investments = investments;
    this.sips = sips;
  }

  // Business methods to compute portfolio metrics.
  // Sells are subtracted: amounts and quantities are stored positive and the
  // direction comes from InvestmentType (see Investment.getSignedAmount).
  public getTotalInvestedAmount(till?: Date, includeFuture: boolean = false): number {
    const investments = this.getInvestments(till ?? new Date(), includeFuture);
    return investments
      .filter(tx => (till ? tx.date <= till : true))
      .reduce((total, transaction) => total + transaction.getSignedAmount(), 0);
  }

  public getTotalQty(till?: Date, includeFuture: boolean = false): number {
    const investments = this.getInvestments(till ?? new Date(), includeFuture);
    return investments
      .filter(tx => (till ? tx.date <= till : true))
      .reduce((total, transaction) => total + transaction.getSignedQuantity(), 0);
  }

  /**
   * Units held now, or `undefined` for an asset that does not record units at
   * all.
   *
   * The distinction is load-bearing because `getMarketValue` multiplies by this.
   * A script returning a NAV needs the unit count; one returning a whole
   * position's worth — several of the shipped templates do exactly that, as does
   * any asset whose transactions carry amounts and no quantities — has nothing
   * to multiply, and `undefined` is what tells the two apart.
   *
   * Zero is therefore a real answer, reached only by an asset that did record
   * units and has since sold them all. A `< 1` test used to fold that in with
   * "no units recorded", and swallowed every fractional holding with it: 0.6
   * units of a fund was valued at one whole unit's NAV, and a position sold in
   * full still showed a unit's worth rather than nothing.
   */
  public getCurrentHoldings(): number | undefined {
    if (!this.investments.some(transaction => transaction.quantity !== 0)) return undefined;
    return this.investments.reduce(
      (total, transaction) => total + transaction.getSignedQuantity(),
      0
    );
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

  public getValueOn(date: Date, includeFutureInvestments: boolean = false): number | undefined {
    switch (this.valueModel) {
      case ValueModel.MARKET_BASED: {
        const investments = this.getInvestments(date, includeFutureInvestments);
        // Nothing to fit a rate to and nothing to grow, so the recorded value is
        // the whole story. Going through the solver anyway returned 0 — it has
        // no transactions to discount — which reported an asset with a perfectly
        // good price on it as worthless, and dragged the portfolio total down
        // with it. An asset whose units are all held elsewhere, or one imported
        // before its transactions were, is exactly this case.
        if (investments.length === 0) return this.getMarketValue();

        const irr = this.getIRR();
        if (irr === undefined) return undefined;
        return IRRCalculator.getInstance().calculateFutureValueOnIRR(
          investments.map(tx => ({
            date: tx.date,
            amount: tx.getSignedAmount(),
          })),
          irr,
          date
        );
      }
      case ValueModel.FIXED_INCOME: {
        // Maturity stops the interest, not the money. Growth is therefore
        // capped at the maturity date, but a deposit made after it is still
        // held — it is added at face value rather than dropped, because the
        // alternative is an asset that counts the money as invested and values
        // it at nothing for ever. Face value claims no return we cannot justify:
        // a matured deposit earns nothing further, and what a later one earns
        // is not something this asset records.
        const fixedIncomeEffectiveDate =
          this.maturityDate && date > this.maturityDate ? this.maturityDate : date;
        const grown = IRRCalculator.getInstance().calculateFutureValueOnIRR(
          this.getInvestments(fixedIncomeEffectiveDate, includeFutureInvestments).map(tx => ({
            date: tx.date,
            amount: tx.getSignedAmount(),
          })),
          this.interestRate!,
          fixedIncomeEffectiveDate
        );
        return (
          grown + this.amountAddedAfter(fixedIncomeEffectiveDate, date, includeFutureInvestments)
        );
      }
      case ValueModel.MATURITY_BASED: {
        const maturityIRR = IRRCalculator.getInstance().calculateIRR({
          transactions: this.getInvestments(date, includeFutureInvestments).map(tx => ({
            date: tx.date,
            amount: tx.getSignedAmount(),
          })),
          value: this.maturityAmount!,
          valueUpdatedOn: this.maturityDate!,
        });
        const maturityBasedEffectiveDate =
          this.maturityDate && date > this.maturityDate ? this.maturityDate : date;
        // As above: past maturity the plan stops growing, and money put in after
        // it must not be discounted *backwards* to the maturity date, which is
        // what passing it through the growth call did.
        const grown = IRRCalculator.getInstance().calculateFutureValueOnIRR(
          this.getInvestments(maturityBasedEffectiveDate, includeFutureInvestments).map(tx => ({
            date: tx.date,
            amount: tx.getSignedAmount(),
          })),
          maturityIRR,
          maturityBasedEffectiveDate
        );
        return (
          grown + this.amountAddedAfter(maturityBasedEffectiveDate, date, includeFutureInvestments)
        );
      }
      default:
        return undefined;
    }
  }

  /**
   * Net amount transacted strictly after `from` and up to `to`. This is the
   * money a value model has stopped accounting for — see the maturity cases in
   * `getValueOn`.
   */
  private amountAddedAfter(from: Date, to: Date, considerFutureTransactions: boolean): number {
    if (from >= to) return 0;
    return this.getInvestments(to, considerFutureTransactions)
      .filter(tx => tx.date > from)
      .reduce((total, tx) => total + tx.getSignedAmount(), 0);
  }

  public getInvestments(till: Date, considerFutureTransactions: boolean): Investment[] {
    let allTransactions = this.investments.filter(t => t.date <= till);
    if (considerFutureTransactions) {
      const futureTransactions = this.sips.map(sip => sip.getPendingOccurrences(till)).flat();
      allTransactions = allTransactions.concat(futureTransactions);
    }
    return allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  public getMarketValue(): number | undefined {
    if (this.valueModel !== ValueModel.MARKET_BASED) {
      return undefined;
    }

    const currentHoldings = this.getCurrentHoldings() ?? 1;

    if (this.scriptValue && this.scriptValueUpdatedAt) {
      const isScriptValueRecent =
        !this.manualValueUpdatedAt || this.scriptValueUpdatedAt >= this.manualValueUpdatedAt;
      if (isScriptValueRecent) {
        return this.scriptValue * currentHoldings;
      }
    }

    return this.manualValue;
  }

  public getMarketValueDate(): Date | undefined {
    if (this.valueModel !== ValueModel.MARKET_BASED) return undefined;
    if (this.scriptValue && this.scriptValueUpdatedAt) {
      if (this.manualValueUpdatedAt === undefined) return this.scriptValueUpdatedAt;
      if (this.scriptValueUpdatedAt >= this.manualValueUpdatedAt) return this.scriptValueUpdatedAt;
    }
    return this.manualValueUpdatedAt;
  }

  public getIRR(): number | undefined {
    switch (this.valueModel) {
      case ValueModel.MARKET_BASED: {
        // The fit may only see the money the recorded value actually measured.
        // A value noted in June cannot account for a deposit made in December,
        // so including later transactions asks for the rate at which the older,
        // smaller figure equals the larger one — and the solver answers -100%,
        // which zeroes the asset for every date. That is not a rounding error:
        // an asset whose value was recorded once and then added to would read as
        // worthless while its money still counted as invested.
        const valuedOn = this.getMarketValueDate() ?? new Date();
        return IRRCalculator.getInstance().calculateIRR({
          transactions: this.getInvestments(valuedOn, false).map(tx => ({
            date: tx.date,
            amount: tx.getSignedAmount(),
          })),
          value: this.getMarketValue() ?? 0,
          valueUpdatedOn: valuedOn,
        });
      }
      case ValueModel.MATURITY_BASED:
        if (this.maturityAmount === undefined || this.maturityDate === undefined) return undefined;
        return IRRCalculator.getInstance().calculateIRR({
          transactions: this.getInvestments(new Date(), false).map(tx => ({
            date: tx.date,
            amount: tx.getSignedAmount(),
          })),
          value: this.maturityAmount ?? 0,
          valueUpdatedOn: this.maturityDate ?? new Date(),
        });
        break;
      case ValueModel.FIXED_INCOME:
        if (this.interestRate === undefined) return undefined;
        return this.interestRate;
        break;
      default:
        return undefined;
    }
  }

  public needsScriptExecution(): boolean {
    return needsScriptExecution(this);
  }
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Whether this asset's value script is due a run.
 *
 * A free function as well as a method because the startup refresh decides from
 * the stored rows: loading every asset's transactions and SIPs — two queries
 * each — only to ask which scripts are stale is N+1 for data the question never
 * reads.
 */
export function needsScriptExecution(asset: IAsset): boolean {
  if (asset.valueModel !== ValueModel.MARKET_BASED || !asset.script) return false;
  if (asset.scriptValue === undefined || asset.scriptValueUpdatedAt === undefined) return true;
  return Date.now() - asset.scriptValueUpdatedAt.getTime() > ONE_DAY_MS;
}
