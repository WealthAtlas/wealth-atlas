import { Logger } from '@/domain/utils/Logger';
import { Box, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';

import { AssetRepository } from '@/data/repositories/assets/AssetRepository';
import { AssetTransactionRepository } from '@/data/repositories/AssetTransactionRepository';
import { ExpenseRepository } from '@/data/repositories/expense/ExpenseRepository';
import { LoanPaymentRepository } from '@/data/repositories/loan/LoanPaymentRepository';
import { LoanRepository } from '@/data/repositories/loan/LoanRepository';
import { Currency } from '@/domain/entities/shared/Currency';
import {
  DashboardAnalyticsService,
  DashboardMetrics,
  ExpenseTrendData,
} from '@/domain/services/DashboardAnalyticsService';
import { DashboardPage } from '../components/Pages/DashboardPage';

export function DashboardContainer() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [expenseTrendData, setExpenseTrendData] = useState<ExpenseTrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Initialize repositories
      const assetRepository = new AssetRepository();
      const assetTransactionRepository = new AssetTransactionRepository();
      const expenseRepository = new ExpenseRepository();
      const loanRepository = new LoanRepository();
      const loanPaymentRepository = new LoanPaymentRepository();

      // Initialize analytics service with USD as default home currency
      const analyticsService = new DashboardAnalyticsService(
        assetRepository,
        assetTransactionRepository,
        expenseRepository,
        loanRepository,
        loanPaymentRepository,
        Currency.USD
      );

      // Get dashboard metrics and expense trend data
      const [dashboardMetrics, expenseTrend] = await Promise.all([
        analyticsService.getDashboardMetrics(),
        analyticsService.getExpenseTrendData(),
      ]);

      setMetrics(dashboardMetrics);
      setExpenseTrendData(expenseTrend);
    } catch (err) {
      Logger.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 200px)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <div>Error: {error}</div>
      </Box>
    );
  }

  return (
    <DashboardPage
      metrics={metrics}
      expenseTrendData={expenseTrendData}
      onRefresh={loadDashboardData}
    />
  );
}
