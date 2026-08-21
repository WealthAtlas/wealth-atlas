import React from 'react';
import {
  AssetCategoryData,
  DashboardMetrics,
  DashboardService,
  MonthlyInvestmentData,
  TimelineData,
} from '../../../domain/services/DashboardService';
import { Logger } from '../../../domain/utils/Logger';
import { DashboardPage } from '../../components/pages/DashboardPage';
import { useCurrency } from '../../components/providers/CurrencyContext';

export function DashboardContainer() {
  const { converter, baseCurrency } = useCurrency();
  const [metrics, setMetrics] = React.useState<DashboardMetrics>({
    totalWealth: 0,
    totalAssetValue: 0,
    totalLoanAmount: 0,
    totalInvestedAmount: 0,
    totalProfitLoss: 0,
    profitLossPercentage: 0,
    currency: baseCurrency,
    unratedCurrencies: [],
  });
  const [monthlyInvestmentData, setMonthlyInvestmentData] = React.useState<MonthlyInvestmentData[]>(
    []
  );
  const [assetCategoryData, setAssetCategoryData] = React.useState<AssetCategoryData[]>([]);
  const [timelineData, setTimelineData] = React.useState<TimelineData[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  const dashboardService = React.useMemo(() => new DashboardService(), []);

  const loadDashboardData = React.useCallback(async () => {
    try {
      setIsLoading(true);
      Logger.info('Loading dashboard data...');

      const [metricsData, monthlyData, categoryData, timelineDataResult] = await Promise.allSettled(
        [
          dashboardService.getDashboardMetrics(converter),
          dashboardService.getMonthlyInvestmentData(converter),
          dashboardService.getAssetCategoryData(converter),
          dashboardService.getTimelineData(converter),
        ]
      );

      if (metricsData.status === 'fulfilled') {
        setMetrics(metricsData.value);
      } else {
        Logger.error('Failed to load dashboard metrics:', metricsData.reason);
      }

      if (monthlyData.status === 'fulfilled') {
        setMonthlyInvestmentData(monthlyData.value);
      } else {
        Logger.error('Failed to load monthly investment data:', monthlyData.reason);
      }

      if (categoryData.status === 'fulfilled') {
        setAssetCategoryData(categoryData.value);
      } else {
        Logger.error('Failed to load asset category data:', categoryData.reason);
      }

      if (timelineDataResult.status === 'fulfilled') {
        setTimelineData(timelineDataResult.value);
      } else {
        Logger.error('Failed to load timeline data:', timelineDataResult.reason);
      }

      Logger.info('Dashboard data loaded successfully');
    } catch (error) {
      Logger.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [dashboardService, converter]);

  React.useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  return (
    <DashboardPage
      metrics={metrics}
      monthlyInvestmentData={monthlyInvestmentData}
      assetCategoryData={assetCategoryData}
      timelineData={timelineData}
      isLoading={isLoading}
      onRefresh={loadDashboardData}
    />
  );
}
