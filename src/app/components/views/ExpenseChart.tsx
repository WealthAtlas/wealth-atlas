import { Box, useMediaQuery, useTheme } from '@mui/material';
import { BarChart } from '@mui/x-charts';
import React from 'react';
import { MonthlyExpense } from '../../../domain/entities/expenses/MonthlyExpense';
import { Currency } from '../../../domain/entities/shared/Currency';

export interface ExpenseChartProps {
  monthlyExpenses: MonthlyExpense[];
}

export function ExpenseChart(props: ExpenseChartProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const getCurrencyColor = React.useCallback(
    (_currency: Currency, index: number) => {
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

  const chartData = React.useMemo(() => {
    const months = Array.from(
      new Set(
        props.monthlyExpenses.map(d => {
          const date = new Date(d.month);
          return date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' });
        })
      )
    ).sort();

    const currencies = Array.from(
      new Set(props.monthlyExpenses.flatMap(d => d.getUniqueCurrencies()))
    ).sort();

    const displayMonths = isMobile ? months.slice(-3) : months.slice(-12);

    const series: Array<{
      dataKey: string;
      label: string;
      stack: string;
      color: string;
    }> = [];

    const data: Array<Record<string, number | string>> = displayMonths.map(month => ({ month }));

    currencies.forEach((currency, currencyIndex) => {
      const currencyColor = getCurrencyColor(currency, currencyIndex);

      const essentialKey = `${currency}_essential`;
      const nonEssentialKey = `${currency}_nonEssential`;

      series.push({
        dataKey: essentialKey,
        label: `${currency} - Essential`,
        stack: `${currency}`,
        color: currencyColor.essential,
      });

      series.push({
        dataKey: nonEssentialKey,
        label: `${currency} - Non-Essential`,
        stack: `${currency}`,
        color: currencyColor.nonEssential,
      });

      data.forEach(item => {
        const monthData = props.monthlyExpenses.find(d => {
          const date = new Date(d.month);
          return (
            date.toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' }) === item.month
          );
        });

        item[essentialKey] = monthData?.getEssentialAmountByCurrency(currency) || 0;
        item[nonEssentialKey] = monthData?.getNonEssentialAmountByCurrency(currency) || 0;
      });
    });

    return { data, series, displayMonths };
  }, [props, isMobile, getCurrencyColor]);

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

  // Calculate minimum width needed for the chart based on number of months and unique currencies
  const uniqueCurrencies = Array.from(new Set(chartData.series.map(s => s.stack)));
  const minChartWidth = chartData.displayMonths.length * (uniqueCurrencies.length * 80);
  const chartWidth = Math.max(minChartWidth, isMobile ? 350 : 800);

  return (
    <Box
      sx={{
        width: '100%',
        height: isMobile ? 250 : 400,
        overflowX: 'auto',
      }}
    >
      <Box sx={{ width: chartWidth, height: '100%' }}>
        <BarChart
          dataset={chartData.data}
          series={chartData.series}
          xAxis={[
            {
              scaleType: 'band',
              dataKey: 'month',
              valueFormatter: formatMonthLabel,
              categoryGapRatio: 0.3, // Controls gap between month groups
              barGapRatio: 0.1, // Controls gap between currency stacks
            },
          ]}
          yAxis={[{}]}
          height={isMobile ? 250 : 400}
          width={chartWidth}
          margin={{
            left: 80,
            right: 30,
            top: 30,
            bottom: 60,
          }}
        />
      </Box>
    </Box>
  );
}
