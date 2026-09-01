import { Asset } from '../entities/assets/Asset';
import { Loan } from '../entities/loans/Loan';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { Logger } from '../utils/Logger';
import { isoDate, monthKey, parseUtcDay } from '../utils/DateUtils';
import { AssetService } from './AssetService';
import { LoanService } from './LoanService';

/**
 * Every figure here is in the base currency. Each asset and loan converts from
 * its own currency at a single rate, so ratios within one holding survive the
 * conversion untouched — see `CurrencyConverter`.
 */
export interface DashboardMetrics {
  totalWealth: number;
  totalAssetValue: number;
  totalLoanAmount: number;
  totalInvestedAmount: number;
  totalProfitLoss: number;
  profitLossPercentage: number;
  currency: Currency;
  /**
   * Currencies in use that have no rate configured. Their holdings contributed 0
   * to every figure above, so the UI must say so: a zeroed loan quietly
   * *inflates* net worth, which reads as good news rather than as an error.
   */
  unratedCurrencies: Currency[];
}

export interface MonthlyInvestmentData {
  month: string;
  amount: number;
  date: Date;
}

export interface AssetCategoryData {
  id: string;
  label: string;
  value: number;
  percentage: number;
}

export interface TimelineData {
  date: Date;
  investedAmount: number;
  assetValue: number;
  cumulativeInvested: number;
  cumulativeValue: number;
}

/** Outstanding principal, or the full principal if the schedule cannot be read. */
function outstandingAmount(loan: Loan): number {
  try {
    return loan.getOutstandingAmount();
  } catch (error) {
    Logger.error(`Failed to calculate outstanding principal for loan ${loan.id}: ${error}`);
    Logger.warn(
      `Failed to calculate outstanding principal for loan ${loan.id}, using principal amount`
    );
    return loan.principalAmount;
  }
}

function currenciesInUse(assets: Asset[], loans: Loan[]): Currency[] {
  return [...assets.map(asset => asset.currency), ...loans.map(loan => loan.currency)];
}

export function computeDashboardMetrics(
  assets: Asset[],
  loans: Loan[],
  converter: CurrencyConverter
): DashboardMetrics {
  const totalAssetValue = assets.reduce(
    (total, asset) => total + converter.toBase(asset.getValue() || 0, asset.currency),
    0
  );

  const totalInvestedAmount = assets.reduce(
    (total, asset) => total + converter.toBase(asset.getTotalInvestedAmount(), asset.currency),
    0
  );

  const totalLoanAmount = loans.reduce(
    (total, loan) => total + converter.toBase(outstandingAmount(loan), loan.currency),
    0
  );

  const totalWealth = totalAssetValue - totalLoanAmount;
  const totalProfitLoss = totalAssetValue - totalInvestedAmount;
  const profitLossPercentage =
    totalInvestedAmount > 0 ? (totalProfitLoss / totalInvestedAmount) * 100 : 0;

  return {
    totalWealth,
    totalAssetValue,
    totalLoanAmount,
    totalInvestedAmount,
    totalProfitLoss,
    profitLossPercentage,
    currency: converter.getBaseCurrency(),
    unratedCurrencies: converter.getUnratedCurrencies(currenciesInUse(assets, loans)),
  };
}

export function computeMonthlyInvestmentData(
  assets: Asset[],
  converter: CurrencyConverter
): MonthlyInvestmentData[] {
  const monthlyMap = new Map<string, number>();

  assets.forEach(asset => {
    asset.getInvestments(new Date(), false).forEach(investment => {
      const key = monthKey(investment.date);
      const amount = converter.toBase(investment.getTotalAmount(), asset.currency);
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + amount);
    });
  });

  return Array.from(monthlyMap.entries())
    .map(([key, amount]) => {
      const [year, month] = key.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
      return { month: monthName, amount, date };
    })
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-12); // Show only last 12 months
}

export function computeAssetCategoryData(
  assets: Asset[],
  converter: CurrencyConverter
): AssetCategoryData[] {
  const categoryMap = new Map<string, number>();
  let totalValue = 0;

  assets.forEach(asset => {
    const value = converter.toBase(asset.getValue() || 0, asset.currency);
    totalValue += value;
    categoryMap.set(asset.category, (categoryMap.get(asset.category) || 0) + value);
  });

  return Array.from(categoryMap.entries())
    .map(([category, value]) => ({
      id: category,
      label: category,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))
    .filter(item => item.value > 0)
    .sort((a, b) => b.value - a.value);
}

export function computeTimelineData(assets: Asset[], converter: CurrencyConverter): TimelineData[] {
  // Investments are grouped by day, but each carries its own asset's currency
  // until it has been converted — the amount alone is not comparable.
  //
  // The amount is signed (`getSignedAmount`), not `getTotalAmount`: totals are
  // stored positive and the direction lives in `type`, so summing the raw totals
  // makes a sell *add* to the money put in. The line is net capital deployed —
  // the same figure `Asset.getTotalInvestedAmount` reports — so a sell reduces it.
  const dailyInvested = new Map<string, number>();

  assets.forEach(asset => {
    asset.getInvestments(new Date(), false).forEach(investment => {
      const dateKey = isoDate(investment.date);
      const amount = converter.toBase(investment.getSignedAmount(), asset.currency);
      dailyInvested.set(dateKey, (dailyInvested.get(dateKey) || 0) + amount);
    });
  });

  const timelineData: TimelineData[] = [];
  let cumulativeInvested = 0;

  Array.from(dailyInvested.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .forEach(([dateKey, investedAmount]) => {
      const date = parseUtcDay(dateKey)!;
      cumulativeInvested += investedAmount;
      const assetValueAtDate = calculateAssetValueAtDate(assets, date, converter);

      timelineData.push({
        date,
        investedAmount,
        assetValue: assetValueAtDate,
        cumulativeInvested,
        cumulativeValue: assetValueAtDate,
      });
    });

  return timelineData;
}

/**
 * `getValueOn` is already the value *as of* `date` — it grows only the
 * transactions dated on or before `date` at the asset's IRR. Scaling it by the
 * share of quantity held by then (what the removed `getWeightedValueOn` did)
 * discounted it a second time, crushing every point except the last toward zero
 * and drawing invested above value for years. See `computeTimelineData`'s test.
 *
 * The curve is a back-projection from a single IRR fitted to today's value, not
 * recorded price history — nothing in `IAsset` stores one — so it is smooth and,
 * for an asset with a positive IRR, never dips below the invested line.
 */
function calculateAssetValueAtDate(
  assets: Asset[],
  date: Date,
  converter: CurrencyConverter
): number {
  return assets.reduce((total, asset) => {
    try {
      const value = asset.getValueOn(date);
      return total + converter.toBase(value || 0, asset.currency);
    } catch (error) {
      Logger.error(`Failed to calculate asset value for ${asset.name} at ${date}: ${error}`);
      // If calculation fails, return 0 for this asset at this date
      return total;
    }
  }, 0);
}

/**
 * Loads the entities each figure needs and hands them to the pure functions
 * above. The converter comes from the caller so a single render shares one set
 * of rates.
 */
export class DashboardService {
  private readonly assetService: AssetService;
  private readonly loanService: LoanService;

  constructor() {
    this.assetService = new AssetService();
    this.loanService = new LoanService();
  }

  public async getDashboardMetrics(converter: CurrencyConverter): Promise<DashboardMetrics> {
    const [assets, loans] = await Promise.all([
      this.assetService.getAssets(),
      this.loanService.getLoans(),
    ]);

    return computeDashboardMetrics(assets, loans, converter);
  }

  public async getMonthlyInvestmentData(
    converter: CurrencyConverter
  ): Promise<MonthlyInvestmentData[]> {
    return computeMonthlyInvestmentData(await this.assetService.getAssets(), converter);
  }

  public async getAssetCategoryData(converter: CurrencyConverter): Promise<AssetCategoryData[]> {
    return computeAssetCategoryData(await this.assetService.getAssets(), converter);
  }

  public async getTimelineData(converter: CurrencyConverter): Promise<TimelineData[]> {
    return computeTimelineData(await this.assetService.getAssets(), converter);
  }
}
