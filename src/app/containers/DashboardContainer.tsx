import { AssetService } from '@/domain/services/AssetService';
import { ExpenseService } from '@/domain/services/ExpenseService';
import { LoanService } from '@/domain/services/LoanService';
import { Logger } from '@/domain/utils/Logger';
import { Box, CircularProgress } from '@mui/material';
import { useEffect, useState } from 'react';
import { DashboardPage } from '../components/Pages/DashboardPage';

export interface ExpenseTrendData {
  date: string;
  amount: number;
  month: string;
  essentialAmount: number;
  nonEssentialAmount: number;
  totalAmount: number;
}

export function DashboardContainer() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<{
    totalInvested: number;
    currentValue: number;
    pendingLoanAmount: number;
    currentMonthExpenses: number;
    lastMonthExpenses: number;
  } | null>(null);
  const [expenseTrendData, setExpenseTrendData] = useState<ExpenseTrendData[]>([]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const assetService = new AssetService();
      const loanService = new LoanService();
      const expenseService = new ExpenseService();

      const [assets, loans, expenses] = await Promise.all([
        assetService.getAssets(),
        loanService.getLoans(),
        expenseService.getAllExpenses(),
      ]);

      const totalInvested = assets.reduce(
        (sum, asset) => sum + asset.getTotalInvestedAmount(asset.getTransactions(new Date(), true)),
        0
      );
      const currentValue = assets.reduce((sum, asset) => sum + (asset.getValue() || 0), 0);
      const pendingLoanAmount = loans.reduce(
        (sum, loan) => sum + loan.getOutstandingPrincipal(),
        0
      );

      const currentMonth = new Date().getMonth();
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const currentMonthExpenses = expenses
        .filter(expense => new Date(expense.date).getMonth() === currentMonth)
        .reduce((sum, expense) => sum + expense.amount, 0);
      const lastMonthExpenses = expenses
        .filter(expense => new Date(expense.date).getMonth() === lastMonth)
        .reduce((sum, expense) => sum + expense.amount, 0);

      setMetrics({
        totalInvested,
        currentValue,
        pendingLoanAmount,
        currentMonthExpenses,
        lastMonthExpenses,
      } as {
        totalInvested: number;
        currentValue: number;
        pendingLoanAmount: number;
        currentMonthExpenses: number;
        lastMonthExpenses: number;
      });

      setExpenseTrendData(
        expenses.map(expense => ({
          date: expense.date.toString(),
          amount: expense.amount,
          month: new Date(expense.date).toLocaleString('default', { month: 'short' }),
          essentialAmount: expense.isEssential ? expense.amount : 0,
          nonEssentialAmount: !expense.isEssential ? expense.amount : 0,
          totalAmount: expense.amount,
        }))
      );
    } catch (err) {
      Logger.error('Error loading dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

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

  if (!metrics) {
    return null; // Ensure `DashboardPage` is not rendered when `metrics` is null
  }

  return (
    <DashboardPage
      metrics={metrics}
      expenseTrendData={expenseTrendData}
      onRefresh={loadDashboardData}
    />
  );
}
