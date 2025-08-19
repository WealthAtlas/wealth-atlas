import { Box, Paper, Typography } from '@mui/material';
import { PieChart } from '@mui/x-charts/PieChart';

import { CurrencyConversionService } from '@/domain/services/CurrencyConversionService';
import { AssetBreakdownItem } from '@/domain/services/DashboardAnalyticsService';

interface AssetAllocationChartProps {
  data: AssetBreakdownItem[];
  currency: string;
  height?: number;
}

export function AssetAllocationChart({ data, currency, height = 400 }: AssetAllocationChartProps) {
  if (!data || data.length === 0) {
    return (
      <Paper elevation={2} sx={{ p: 3, height }}>
        <Typography variant="h5" gutterBottom>
          Asset Allocation
        </Typography>
        <Box
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80%' }}
        >
          <Typography variant="body1" color="text.secondary">
            No assets available
          </Typography>
        </Box>
      </Paper>
    );
  }

  // Prepare data for the pie chart
  const chartData = data.map((asset, index) => ({
    id: index,
    value: asset.currentValue,
    label: asset.assetName,
    category: asset.category,
  }));

  // Generate distinct colors for each asset
  const colors = [
    '#1976d2',
    '#dc004e',
    '#2e7d32',
    '#ed6c02',
    '#9c27b0',
    '#f57c00',
    '#d32f2f',
    '#1565c0',
    '#5e35b1',
    '#c62828',
  ];

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Asset Allocation
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Portfolio distribution by asset
      </Typography>

      <PieChart
        series={[
          {
            data: chartData,
            highlightScope: { fade: 'global', highlight: 'item' },
            faded: { innerRadius: 30, additionalRadius: -30, color: 'gray' },
            valueFormatter: item => CurrencyConversionService.formatCurrency(item.value, currency),
          },
        ]}
        colors={colors}
        height={height - 120}
        margin={{ right: 150 }}
      />
    </Paper>
  );
}
