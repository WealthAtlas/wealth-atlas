import { Box, Paper, Typography } from '@mui/material';
import { LineChart } from '@mui/x-charts/LineChart';

import { CurrencyConversionService } from '@/domain/services/CurrencyConversionService';
import { PortfolioTimelinePoint } from '@/domain/services/DashboardAnalyticsService';

interface PortfolioGrowthChartProps {
  data: PortfolioTimelinePoint[];
  currency: string;
  height?: number;
}

export function PortfolioGrowthChart({ data, currency, height = 400 }: PortfolioGrowthChartProps) {
  if (!data || data.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, height }}>
        <Typography variant="h5" gutterBottom>
          Portfolio Growth Timeline
        </Typography>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%' }}
        >
          <Typography variant="body1" color="text.secondary">
            No transaction data available
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Prepare data for the chart
  const chartData = data.map(point => ({
    date: point.date.getTime(), // Convert to timestamp for x-axis
    invested: point.investedAmount,
    market: point.marketValue,
  }));

  // Format currency for tooltips
  const formatTooltip = (value: number) =>
    CurrencyConversionService.formatCurrency(value, currency);

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Portfolio Growth Timeline
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Track your investment journey over time
      </Typography>

      <LineChart
        width={undefined} // Let it be responsive
        height={height - 120} // Account for title and padding
        series={[
          {
            data: chartData.map(d => d.invested),
            label: 'Total Invested',
            color: '#1976d2',
            curve: 'linear',
          },
          {
            data: chartData.map(d => d.market),
            label: 'Market Value',
            color: '#2e7d32',
            curve: 'linear',
          },
        ]}
        xAxis={[
          {
            data: chartData.map(d => d.date),
            label: 'Date',
            valueFormatter: value => new Date(value).toLocaleDateString(),
            scaleType: 'time',
          },
        ]}
        yAxis={[
          {
            label: `Amount (${currency})`,
            valueFormatter: formatTooltip,
          },
        ]}
        margin={{ left: 70, right: 50, top: 50, bottom: 50 }}
        grid={{ vertical: true, horizontal: true }}
      />
    </Paper>
  );
}
