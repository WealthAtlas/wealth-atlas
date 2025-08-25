import { Box, Paper, Typography } from '@mui/material';
import { BarChart } from '@mui/x-charts/BarChart';

interface ExpenseTrendData {
  month: string;
  essentialAmount: number;
  nonEssentialAmount: number;
  totalAmount: number;
}

interface ExpenseTrendChartProps {
  data: ExpenseTrendData[];
  currency: string;
  height?: number;
}

export function ExpenseTrendChart({ data, currency, height = 400 }: ExpenseTrendChartProps) {
  if (!data || data.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, height }}>
        <Typography variant="h5" gutterBottom>
          Expense Trends
        </Typography>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%' }}
        >
          <Typography variant="body1" color="text.secondary">
            No expense data available
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Sort data by month (assuming YYYY-MM format)
  const sortedData = [...data].sort((a, b) => a.month.localeCompare(b.month));

  // Format month labels for display
  const formatMonth = (monthStr: string): string => {
    const [year, month] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const xAxisData = sortedData.map(item => formatMonth(item.month));
  const essentialData = sortedData.map(item => item.essentialAmount);
  const nonEssentialData = sortedData.map(item => item.nonEssentialAmount);

  const formatTooltip = (value: number | null): string => {
    if (value === null) return 'N/A';
    return UIUtils.formatCurrency(value, currency);
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Expense Trends
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Monthly spending patterns over time
      </Typography>

      <BarChart
        width={undefined} // Let it be responsive
        height={height - 120}
        series={[
          {
            data: essentialData,
            label: 'Essential',
            id: 'essential',
            color: '#d32f2f',
            valueFormatter: formatTooltip,
          },
          {
            data: nonEssentialData,
            label: 'Non-Essential',
            id: 'non-essential',
            color: '#ff9800',
            valueFormatter: formatTooltip,
          },
        ]}
        xAxis={[{ data: xAxisData, scaleType: 'band' }]}
        yAxis={[
          {
            label: `Amount (${currency})`,
            valueFormatter: (value: number | null) =>
              value !== null ? UIUtils.formatCurrency(value, currency) : 'N/A',
          },
        ]}
        margin={{ left: 70, right: 50, top: 50, bottom: 50 }}
      />
    </Paper>
  );
}
