import { Asset } from '../entities/assets/Asset';
import { Investment } from '../entities/assets/Investment';
import { AssetService } from './AssetService';
import { LoanService } from './LoanService';

export interface DashboardMetrics {
  totalWealth: number;
  totalAssetValue: number;
  totalLoanAmount: number;
  totalInvestedAmount: number;
  totalProfitLoss: number;
  profitLossPercentage: number;
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

export class DashboardService {
  private readonly assetService: AssetService;
  private readonly loanService: LoanService;

  constructor() {
    this.assetService = new AssetService();
    this.loanService = new LoanService();
  }

  public async getDashboardMetrics(): Promise<DashboardMetrics> {
    const [assets, loans] = await Promise.all([
      this.assetService.getAssets(),
      this.loanService.getLoans(),
    ]);

    const totalAssetValue = assets.reduce((total, asset) => {
      const value = asset.getValue();
      return total + (value || 0);
    }, 0);

    const totalInvestedAmount = assets.reduce((total, asset) => {
      return total + asset.getTotalInvestedAmount();
    }, 0);

    const totalLoanAmount = loans.reduce((total, loan) => {
      try {
        return total + loan.getOutstandingPrincipal();
      } catch (error) {
        // If calculation fails, use principal amount as fallback
        console.warn(
          `Failed to calculate outstanding principal for loan ${loan.id}, using principal amount`
        );
        return total + loan.principalAmount;
      }
    }, 0);

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
    };
  }

  public async getMonthlyInvestmentData(): Promise<MonthlyInvestmentData[]> {
    const assets = await this.assetService.getAssets();
    const allInvestments: Investment[] = [];

    assets.forEach(asset => {
      const investments = asset.getInvestments(new Date(), false);
      allInvestments.push(...investments);
    });

    // Group investments by month
    const monthlyMap = new Map<string, number>();

    allInvestments.forEach(investment => {
      const monthKey = `${investment.date.getFullYear()}-${String(investment.date.getMonth() + 1).padStart(2, '0')}`;
      const currentAmount = monthlyMap.get(monthKey) || 0;
      monthlyMap.set(monthKey, currentAmount + investment.getTotalAmount());
    });

    // Convert to array and sort by date
    return Array.from(monthlyMap.entries())
      .map(([monthKey, amount]) => {
        const [year, month] = monthKey.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        const monthName = date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
        return {
          month: monthName,
          amount,
          date,
        };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-12); // Show only last 12 months
  }

  public async getAssetCategoryData(): Promise<AssetCategoryData[]> {
    const assets = await this.assetService.getAssets();

    const categoryMap = new Map<string, number>();
    let totalValue = 0;

    assets.forEach(asset => {
      const value = asset.getValue() || 0;
      totalValue += value;

      const currentValue = categoryMap.get(asset.category) || 0;
      categoryMap.set(asset.category, currentValue + value);
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

  public async getTimelineData(): Promise<TimelineData[]> {
    const assets = await this.assetService.getAssets();
    const allInvestments: Investment[] = [];

    assets.forEach(asset => {
      const investments = asset.getInvestments(new Date(), false);
      allInvestments.push(...investments);
    });

    // Sort investments by date
    allInvestments.sort((a, b) => a.date.getTime() - b.date.getTime());

    const timelineData: TimelineData[] = [];
    let cumulativeInvested = 0;

    // Group investments by date and calculate cumulative values
    const dateMap = new Map<string, Investment[]>();

    allInvestments.forEach(investment => {
      const dateKey = investment.date.toISOString().split('T')[0];
      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, []);
      }
      dateMap.get(dateKey)!.push(investment);
    });

    // Process each unique date
    Array.from(dateMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .forEach(([dateKey, investments]) => {
        const date = new Date(dateKey);
        const dailyInvestment = investments.reduce((sum, inv) => sum + inv.getTotalAmount(), 0);
        cumulativeInvested += dailyInvestment;

        // Calculate asset value at this point in time
        const assetValueAtDate = this.calculateAssetValueAtDate(assets, date);

        timelineData.push({
          date,
          investedAmount: dailyInvestment,
          assetValue: assetValueAtDate,
          cumulativeInvested,
          cumulativeValue: assetValueAtDate,
        });
      });

    return timelineData;
  }

  private calculateAssetValueAtDate(assets: Asset[], date: Date): number {
    return assets.reduce((total, asset) => {
      try {
        const value = asset.getValueOn(date);
        return total + (value || 0);
      } catch (error) {
        // If calculation fails, return 0 for this asset at this date
        console.warn(`Failed to calculate asset value for ${asset.name} at ${date}`);
        return total;
      }
    }, 0);
  }
}
