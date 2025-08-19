import { useEffect, useState } from 'react';
import { CircularProgress, Box } from '@mui/material';

import { AssetRepository } from '@/data/repositories/AssetRepository';
import { AssetTransactionRepository } from '@/data/repositories/AssetTransactionRepository';
import { ExpenseRepository } from '@/data/repositories/ExpenseRepository';
import { LoanRepository } from '@/data/repositories/LoanRepository';
import { LoanPaymentRepository } from '@/data/repositories/LoanPaymentRepository';
import { DashboardAnalyticsService, DashboardMetrics } from '@/domain/services/DashboardAnalyticsService';
import { Currency } from '@/domain/entities/shared/Currency';
import { DashboardPage } from '../components/Pages/DashboardPage';

export function DashboardContainer() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
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

      // Get dashboard metrics
      const dashboardMetrics = await analyticsService.getDashboardMetrics();
      setMetrics(dashboardMetrics);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
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
          height: 'calc(100vh - 200px)' 
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

  return <DashboardPage metrics={metrics} onRefresh={loadDashboardData} />;
}
