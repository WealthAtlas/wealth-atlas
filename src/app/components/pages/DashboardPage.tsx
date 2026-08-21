import { Refresh as RefreshIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Grid,
  IconButton,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { BarChart, LineChart, PieChart } from '@mui/x-charts';
import {
  AssetCategoryData,
  DashboardMetrics,
  MonthlyInvestmentData,
  TimelineData,
} from '../../../domain/services/DashboardService';
import { UIUtils } from '../../utils/UIUtils';

export interface DashboardPageProps {
  metrics: DashboardMetrics;
  monthlyInvestmentData: MonthlyInvestmentData[];
  assetCategoryData: AssetCategoryData[];
  timelineData: TimelineData[];
  isLoading: boolean;
  onRefresh?: () => void;
}

export function DashboardPage({
  metrics,
  monthlyInvestmentData,
  assetCategoryData,
  timelineData,
  isLoading,
  onRefresh,
}: DashboardPageProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const formatPercentage = (percentage: number): string => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(2)}%`;
  };

  const getColorBasedOnValue = (value: number) => {
    return value >= 0 ? theme.palette.success.main : theme.palette.error.main;
  };

  if (isLoading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>
        <Typography color="text.secondary">Loading dashboard data...</Typography>
      </Box>
    );
  }

  const chartColors = [
    theme.palette.primary.main,
    theme.palette.secondary.main,
    theme.palette.success.main,
    theme.palette.warning.main,
    theme.palette.error.main,
    theme.palette.info.main,
    theme.palette.primary.light,
    theme.palette.secondary.light,
    theme.palette.success.light,
    theme.palette.warning.light,
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Dashboard</Typography>
        {onRefresh && (
          <Tooltip title="Refresh dashboard data">
            <IconButton onClick={onRefresh} disabled={isLoading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        )}
      </Box>

      {/* An unrated currency contributes 0 to every figure below. Saying so
          matters most for loans: a zeroed loan inflates net worth, which reads
          as good news rather than as missing configuration. */}
      {metrics.unratedCurrencies.length > 0 && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          No exchange rate for {metrics.unratedCurrencies.join(', ')}. Holdings and loans in{' '}
          {metrics.unratedCurrencies.length > 1 ? 'those currencies' : 'that currency'} are counted
          as zero — add a rate in Settings to include them.
        </Alert>
      )}

      {/* Wealth Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Wealth
              </Typography>
              <Typography variant="h5" sx={{ color: getColorBasedOnValue(metrics.totalWealth) }}>
                {UIUtils.formatCurrency(metrics.totalWealth, metrics.currency)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Assets - Loans
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Asset Value
              </Typography>
              <Typography variant="h5">
                {UIUtils.formatCurrency(metrics.totalAssetValue, metrics.currency)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Current market value
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Profit/Loss
              </Typography>
              <Typography
                variant="h5"
                sx={{ color: getColorBasedOnValue(metrics.totalProfitLoss) }}
              >
                {UIUtils.formatCurrency(metrics.totalProfitLoss, metrics.currency)}
              </Typography>
              <Typography
                variant="body2"
                sx={{ color: getColorBasedOnValue(metrics.profitLossPercentage) }}
              >
                {formatPercentage(metrics.profitLossPercentage)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6} lg={3}>
          <Card>
            <CardContent>
              <Typography color="text.secondary" gutterBottom>
                Total Invested
              </Typography>
              <Typography variant="h5">
                {UIUtils.formatCurrency(metrics.totalInvestedAmount, metrics.currency)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Capital deployed
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Empty State Message */}
      {!isLoading && metrics.totalAssetValue === 0 && (
        <Card
          sx={{ mb: 4, bgcolor: theme.palette.info.light, color: theme.palette.info.contrastText }}
        >
          <CardContent sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              Welcome to Your Wealth Dashboard!
            </Typography>
            <Typography variant="body1">
              Start by adding your first asset or investment to see your wealth analytics.
            </Typography>
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.8 }}>
              Navigate to the Assets tab to add your investments, stocks, or other assets.
            </Typography>
          </CardContent>
        </Card>
      )}

      {/* Charts Grid */}
      <Grid container spacing={3}>
        {/* Monthly Investment Chart */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Monthly Investment Flow
              </Typography>
              {monthlyInvestmentData.length > 0 ? (
                <Box sx={{ height: 300, mt: 2 }}>
                  <BarChart
                    dataset={monthlyInvestmentData.map(item => ({
                      month: item.month,
                      amount: item.amount,
                    }))}
                    xAxis={[
                      {
                        scaleType: 'band',
                        dataKey: 'month',
                        label: 'Month',
                      },
                    ]}
                    series={[
                      {
                        dataKey: 'amount',
                        label: 'Investment Amount',
                        color: theme.palette.primary.main,
                        valueFormatter: value =>
                          UIUtils.formatCurrency(value as number, metrics.currency),
                      },
                    ]}
                    width={isMobile ? 300 : 500}
                    height={300}
                    margin={{
                      top: 20,
                      bottom: 80,
                      left: 80,
                      right: 20,
                    }}
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    height: 300,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  No investment data available
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Asset Category Pie Chart */}
        <Grid item xs={12} lg={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Asset Allocation by Category
              </Typography>
              {assetCategoryData.length > 0 ? (
                <Box sx={{ height: 300, mt: 2, display: 'flex', justifyContent: 'center' }}>
                  <PieChart
                    series={[
                      {
                        data: assetCategoryData,
                        valueFormatter: value =>
                          UIUtils.formatCurrency(value.value, metrics.currency),
                      },
                    ]}
                    colors={chartColors}
                    width={isMobile ? 300 : 450}
                    height={300}
                    margin={{
                      top: 20,
                      bottom: 20,
                      left: 20,
                      right: 100,
                    }}
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    height: 300,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  No asset data available
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Timeline Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Investment Timeline: Invested vs Asset Value
              </Typography>
              {timelineData.length > 0 ? (
                <Box sx={{ height: 400, mt: 2 }}>
                  <LineChart
                    dataset={timelineData.map(item => ({
                      date: item.date,
                      cumulativeInvested: item.cumulativeInvested,
                      cumulativeValue: item.cumulativeValue,
                    }))}
                    xAxis={[
                      {
                        scaleType: 'time',
                        dataKey: 'date',
                        label: 'Date',
                      },
                    ]}
                    series={[
                      {
                        dataKey: 'cumulativeInvested',
                        label: 'Cumulative Invested',
                        color: theme.palette.primary.main,
                        valueFormatter: value =>
                          UIUtils.formatCurrency(value as number, metrics.currency),
                      },
                      {
                        dataKey: 'cumulativeValue',
                        label: 'Asset Value',
                        color: theme.palette.success.main,
                        valueFormatter: value =>
                          UIUtils.formatCurrency(value as number, metrics.currency),
                      },
                    ]}
                    width={isMobile ? 300 : 800}
                    height={400}
                    margin={{
                      top: 20,
                      bottom: 60,
                      left: 100,
                      right: 20,
                    }}
                  />
                </Box>
              ) : (
                <Box
                  sx={{
                    height: 400,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'text.secondary',
                  }}
                >
                  No timeline data available
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Loan Information if exists */}
      {metrics.totalLoanAmount > 0 && (
        <Grid container spacing={3} sx={{ mt: 2 }}>
          <Grid item xs={12}>
            <Card
              sx={{
                bgcolor: theme.palette.warning.light,
                color: theme.palette.warning.contrastText,
              }}
            >
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Outstanding Loans
                </Typography>
                <Typography variant="h4">
                  {UIUtils.formatCurrency(metrics.totalLoanAmount, metrics.currency)}
                </Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>
                  This amount is deducted from your total wealth calculation
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
