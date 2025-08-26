import { Box, Grid, Paper, Typography } from '@mui/material';
import { ExpenseTrendChart } from '../Charts/ExpenseTrendChart';

interface ExpenseTrendData {
  date: string;
  amount: number;
  month?: string;
  essentialAmount?: number;
  nonEssentialAmount?: number;
  totalAmount?: number;
}

interface DashboardPageProps {
  metrics: {
    totalInvested: number;
    currentValue: number;
    pendingLoanAmount: number;
    currentMonthExpenses: number;
    lastMonthExpenses: number;
  };
  expenseTrendData: ExpenseTrendData[];
  onRefresh: () => Promise<void>; // Added `onRefresh` prop
}

export function DashboardPage({ metrics, expenseTrendData }: DashboardPageProps) {
  if (!metrics) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography variant="h6">No data available</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" component="h1" gutterBottom>
        Dashboard
      </Typography>
      <Grid container spacing={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6">Total Invested</Typography>
            <Typography variant="h4">${metrics.totalInvested.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6">Current Value</Typography>
            <Typography variant="h4">${metrics.currentValue.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6">Pending Loans</Typography>
            <Typography variant="h4">${metrics.pendingLoanAmount.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6">Current Month Expenses</Typography>
            <Typography variant="h4">${metrics.currentMonthExpenses.toFixed(2)}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={2} sx={{ p: 3 }}>
            <Typography variant="h6">Last Month Expenses</Typography>
            <Typography variant="h4">${metrics.lastMonthExpenses.toFixed(2)}</Typography>
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          Expense Trends
        </Typography>
        <ExpenseTrendChart
          data={expenseTrendData.map(data => ({
            ...data,
            month: data.month || '',
            essentialAmount: data.essentialAmount || 0,
            nonEssentialAmount: data.nonEssentialAmount || 0,
            totalAmount: data.totalAmount || 0,
          }))}
          currency="$"
          height={400}
        />
      </Box>
    </Box>
  );
}
