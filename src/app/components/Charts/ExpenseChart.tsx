import { MonthlyExpenseSummary } from '@/domain/services/ExpenseAnalyticsService';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import { BarChart } from '@mui/x-charts';
import React from 'react';

interface ExpenseChartProps {
  monthlyData: MonthlyExpenseSummary[];
}

export function ExpenseChart({ monthlyData }: ExpenseChartProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const getCurrencyColor = React.useCallback(
    (_currency: string, index: number) => {
      const colors = [
        { essential: theme.palette.primary.main, nonEssential: theme.palette.primary.light },
        { essential: theme.palette.secondary.main, nonEssential: theme.palette.secondary.light },
        { essential: theme.palette.success.main, nonEssential: theme.palette.success.light },
        { essential: theme.palette.warning.main, nonEssential: theme.palette.warning.light },
        { essential: theme.palette.error.main, nonEssential: theme.palette.error.light },
      ];
      return colors[index % colors.length];
    },
    [theme]
  );

  // Group data by month, then by currency
  const chartData = React.useMemo(() => {
    const months = Array.from(new Set(monthlyData.map(d => d.month))).sort();
    const currencies = Array.from(new Set(monthlyData.map(d => d.currency))).sort();

    // Limit months for mobile
    const displayMonths = isMobile ? months.slice(-3) : months.slice(-12);

    const series: Array<{
      dataKey: string;
      label: string;
      stack: string;
      color: string;
    }> = [];

    const data: Array<Record<string, number | string>> = displayMonths.map(month => ({ month }));

    // Create series for each currency and essential/non-essential combination
    currencies.forEach((currency, currencyIndex) => {
      const currencyColor = getCurrencyColor(currency, currencyIndex);

      // Essential expenses for this currency
      const essentialKey = `${currency}_essential`;
      const nonEssentialKey = `${currency}_nonEssential`;

      series.push({
        dataKey: essentialKey,
        label: `${currency} - Essential`,
        stack: currency,
        color: currencyColor.essential,
      });

      series.push({
        dataKey: nonEssentialKey,
        label: `${currency} - Non-Essential`,
        stack: currency,
        color: currencyColor.nonEssential,
      });

      // Populate data for each month
      data.forEach((item, index) => {
        const month = displayMonths[index];
        const monthData = monthlyData.find(d => d.month === month && d.currency === currency);

        item[essentialKey] = monthData?.essentialAmount || 0;
        item[nonEssentialKey] = monthData?.nonEssentialAmount || 0;
      });
    });

    return { data, series, displayMonths };
  }, [monthlyData, isMobile, getCurrencyColor]);

  const formatMonthLabel = (month: string) => {
    const date = new Date(month + '-01');
    return date.toLocaleDateString('en-US', {
      month: 'short',
      year: isMobile ? undefined : '2-digit',
    });
  };

  if (chartData.data.length === 0) {
    return (
      <Box
        sx={{
          height: 300,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'text.secondary',
        }}
      >
        No expense data available
      </Box>
    );
  }

  return (
    <Box
      sx={{ width: '100%', height: isMobile ? 250 : 400, overflowX: isMobile ? 'auto' : 'visible' }}
    >
      <BarChart
        dataset={chartData.data}
        series={chartData.series}
        xAxis={[
          {
            scaleType: 'band',
            dataKey: 'month',
            valueFormatter: formatMonthLabel,
          },
        ]}
        yAxis={[{}]}
        height={isMobile ? 250 : 400}
        margin={{
          left: 80,
          right: 30,
          top: 30,
          bottom: 60,
        }}
      />
    </Box>
  );
}
