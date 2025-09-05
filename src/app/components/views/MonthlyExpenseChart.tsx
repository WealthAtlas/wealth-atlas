import { Box, useMediaQuery, useTheme } from '@mui/material';
import {
  BarPlot,
  ChartContainer,
  ChartsLegend,
  ChartsXAxis,
  ChartsYAxis,
  LinePlot,
} from '@mui/x-charts';
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

    const barSeries: Array<{
      dataKey: string;
      label: string;
      stack: string;
      color: string;
      type: 'bar';
    }> = [];

    const lineSeries: Array<{
      dataKey: string;
      label: string;
      color: string;
      type: 'line';
    }> = [];

    const data: Array<Record<string, number | string>> = displayMonths.map(month => ({ month }));

    // Calculate averages for each currency across all available data
    const currencyAverages: Record<string, number> = {};
    currencies.forEach(currency => {
      const totalAmounts = props.monthlyExpenses.map(
        monthData =>
          (monthData.getEssentialAmountByCurrency(currency) || 0) +
          (monthData.getNonEssentialAmountByCurrency(currency) || 0)
      );
      currencyAverages[currency] =
        totalAmounts.reduce((sum, amount) => sum + amount, 0) / totalAmounts.length;
    });

    currencies.forEach((currency, currencyIndex) => {
      const currencyColor = getCurrencyColor(currency, currencyIndex);

      const essentialKey = `${currency}_essential`;
      const nonEssentialKey = `${currency}_nonEssential`;
      const averageKey = `${currency}_average`;

      barSeries.push({
        dataKey: essentialKey,
        label: `${currency} - Essential`,
        stack: `${currency}`,
        color: currencyColor.essential,
        type: 'bar',
      });

      barSeries.push({
        dataKey: nonEssentialKey,
        label: `${currency} - Non-Essential`,
        stack: `${currency}`,
        color: currencyColor.nonEssential,
        type: 'bar',
      });

      // Add average line series
      lineSeries.push({
        dataKey: averageKey,
        label: `${currency} - Average`,
        color: theme.palette.text.primary,
        type: 'line',
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
        item[averageKey] = currencyAverages[currency];
      });
    });

    return { data, barSeries, lineSeries, displayMonths };
  }, [props, isMobile, getCurrencyColor, theme.palette.text.primary]);

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
  const uniqueCurrencies = Array.from(new Set(chartData.barSeries.map(s => s.stack)));
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
        <ChartContainer
          dataset={chartData.data}
          series={[...chartData.barSeries, ...chartData.lineSeries]}
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
        >
          <BarPlot />
          <LinePlot />
          <ChartsXAxis />
          <ChartsYAxis />
          <ChartsLegend />
        </ChartContainer>
      </Box>
    </Box>
  );
}
