import { AccountBalance, Assessment, Receipt, Refresh, TrendingUp } from '@mui/icons-material';
import { Alert, Box, Card, CardContent, Grid, IconButton, Paper, Typography } from '@mui/material';

import { CurrencyConversionService } from '@/domain/services/CurrencyConversionService';
import { DashboardMetrics, ExpenseTrendData } from '@/domain/services/DashboardAnalyticsService';
import { AssetAllocationChart } from '../Charts/AssetAllocationChart';
import { ExpenseTrendChart } from '../Charts/ExpenseTrendChart';
import { PortfolioGrowthChart } from '../Charts/PortfolioGrowthChart';

interface DashboardPageProps {
  metrics: DashboardMetrics | null;
  expenseTrendData: ExpenseTrendData[];
  onRefresh: () => Promise<void>;
}

export function DashboardPage({ metrics, expenseTrendData, onRefresh }: DashboardPageProps) {
  if (!metrics) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="info">No data available</Alert>
      </Box>
    );
  }

  const stats = [
    {
      title: 'Total Portfolio Value',
      value: CurrencyConversionService.formatCurrency(
        metrics.portfolio.currentValue,
        metrics.portfolio.currency
      ),
      icon: <AccountBalance color="primary" />,
      change: `${metrics.portfolio.profitLossPercentage >= 0 ? '+' : ''}${metrics.portfolio.profitLossPercentage.toFixed(1)}%`,
      changeColor: metrics.portfolio.profitLossPercentage >= 0 ? 'success.main' : 'error.main',
    },
    {
      title: 'Portfolio Growth',
      value: CurrencyConversionService.formatCurrency(
        metrics.portfolio.profitLoss,
        metrics.portfolio.currency
      ),
      icon: <TrendingUp color="success" />,
      change: `Invested: ${CurrencyConversionService.formatCurrency(metrics.portfolio.totalInvested, metrics.portfolio.currency)}`,
      changeColor: 'text.secondary',
    },
    {
      title: 'Outstanding Loans',
      value: CurrencyConversionService.formatCurrency(
        metrics.loans.totalOutstanding,
        metrics.loans.currency
      ),
      icon: <Assessment color="warning" />,
      change: `Pending: ${CurrencyConversionService.formatCurrency(metrics.loans.totalPending, metrics.loans.currency)}`,
      changeColor: 'text.secondary',
    },
    {
      title: 'Monthly Expenses',
      value: CurrencyConversionService.formatCurrency(
        metrics.expenses.currentMonthTotal,
        metrics.expenses.currency
      ),
      icon: <Receipt color="error" />,
      change: `${metrics.expenses.monthOverMonthPercentage >= 0 ? '+' : ''}${metrics.expenses.monthOverMonthPercentage.toFixed(1)}% from last month`,
      changeColor: metrics.expenses.monthOverMonthPercentage >= 0 ? 'error.main' : 'success.main',
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <div>
          <Typography variant="h4" component="h1" gutterBottom>
            Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Welcome back! Here&apos;s an overview of your financial portfolio.
          </Typography>
        </div>
        <IconButton onClick={onRefresh} color="primary">
          <Refresh />
        </IconButton>
      </Box>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  {stat.icon}
                  <Typography variant="h6" component="div" sx={{ ml: 1 }}>
                    {stat.title}
                  </Typography>
                </Box>
                <Typography variant="h4" component="div" gutterBottom>
                  {stat.value}
                </Typography>
                <Typography variant="body2" color={stat.changeColor}>
                  {stat.change}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Portfolio Breakdown */}
        {metrics.portfolio.assetBreakdown.length > 0 && (
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Asset Breakdown
              </Typography>
              {metrics.portfolio.assetBreakdown.slice(0, 5).map((asset, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" fontWeight="medium">
                      {asset.assetName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {asset.percentage.toFixed(1)}%
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2">
                      {CurrencyConversionService.formatCurrency(
                        asset.currentValue,
                        metrics.portfolio.currency
                      )}
                    </Typography>
                    <Typography
                      variant="body2"
                      color={asset.profitLoss >= 0 ? 'success.main' : 'error.main'}
                    >
                      {asset.profitLoss >= 0 ? '+' : ''}
                      {CurrencyConversionService.formatCurrency(
                        asset.profitLoss,
                        metrics.portfolio.currency
                      )}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Paper>
          </Grid>
        )}

        {/* Expense Summary */}
        <Grid item xs={12} md={6}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              Expense Summary
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Essential Expenses
              </Typography>
              <Typography variant="h6">
                {CurrencyConversionService.formatCurrency(
                  metrics.expenses.currentMonthEssential,
                  metrics.expenses.currency
                )}
              </Typography>
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Non-Essential Expenses
              </Typography>
              <Typography variant="h6">
                {CurrencyConversionService.formatCurrency(
                  metrics.expenses.currentMonthNonEssential,
                  metrics.expenses.currency
                )}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body2" color="text.secondary">
                Previous Month
              </Typography>
              <Typography variant="body1">
                {CurrencyConversionService.formatCurrency(
                  metrics.expenses.previousMonthTotal,
                  metrics.expenses.currency
                )}
              </Typography>
            </Box>
          </Paper>
        </Grid>

        {/* Next Payment Due */}
        {metrics.loans.nextPaymentDue && (
          <Grid item xs={12} md={6}>
            <Paper elevation={2} sx={{ p: 3 }}>
              <Typography variant="h5" gutterBottom>
                Next Payment Due
              </Typography>
              <Typography variant="h6" gutterBottom>
                {metrics.loans.nextPaymentDue.loanName}
              </Typography>
              <Typography variant="h4" color="warning.main" gutterBottom>
                {CurrencyConversionService.formatCurrency(
                  metrics.loans.nextPaymentDue.amount,
                  metrics.loans.currency
                )}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Due: {metrics.loans.nextPaymentDue.date?.toLocaleDateString() || 'No date set'}
              </Typography>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Portfolio Growth Timeline */}
        {metrics.portfolio.growthTimeline.length > 0 && (
          <Grid item xs={12}>
            <PortfolioGrowthChart
              data={metrics.portfolio.growthTimeline}
              currency={metrics.portfolio.currency}
              height={400}
            />
          </Grid>
        )}

        {/* Asset Allocation and Expense Trend */}
        <Grid item xs={12} lg={6}>
          <AssetAllocationChart
            data={metrics.portfolio.assetBreakdown}
            currency={metrics.portfolio.currency}
            height={400}
          />
        </Grid>

        <Grid item xs={12} lg={6}>
          <ExpenseTrendChart
            data={expenseTrendData}
            currency={metrics.expenses.currency}
            height={400}
          />
        </Grid>
      </Grid>
    </Box>
  );
}
