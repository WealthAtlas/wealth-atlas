import { Currency } from '@/domain/entities/shared/Currency';
import { CurrencyConverter } from '@/domain/entities/shared/CurrencyConverter';
import { Box, useMediaQuery, useTheme } from '@mui/material';
import {
  BarPlot,
  ChartContainer,
  ChartsLegend,
  ChartsTooltip,
  ChartsXAxis,
  ChartsYAxis,
  LinePlot,
} from '@mui/x-charts';
import React from 'react';
import { MonthlyExpense } from '../../../domain/entities/expenses/MonthlyExpense';
import { UIUtils } from '../../utils/UIUtils';

export interface ExpenseChartProps {
  monthlyExpenses: MonthlyExpense[];
  /**
   * Every bar is in the base currency. The chart used to carry one stack per
   * currency, which made a month's spend impossible to read off at a glance.
   */
  currency: Currency;
  converter: CurrencyConverter;
}

const ESSENTIAL_KEY = 'essential';
const NON_ESSENTIAL_KEY = 'nonEssential';
const AVERAGE_KEY = 'average';

export function ExpenseChart({ monthlyExpenses, currency, converter }: ExpenseChartProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const monthLabel = React.useCallback((month: Date): string => {
    return new Date(month).toLocaleDateString('en-CA', { year: 'numeric', month: '2-digit' });
  }, []);

  const chartData = React.useMemo(() => {
    const months = Array.from(
      new Set(monthlyExpenses.map(expense => monthLabel(expense.month)))
    ).sort();
    const displayMonths = isMobile ? months.slice(-3) : months.slice(-12);

    // The average spans every month on record, not just the displayed window,
    // so a narrow mobile view does not move the reference line.
    const monthlyTotals = monthlyExpenses.map(monthData => monthData.getTotalAmount(converter));
    const average = monthlyTotals.length
      ? monthlyTotals.reduce((sum, amount) => sum + amount, 0) / monthlyTotals.length
      : 0;

    const data = displayMonths.map(month => {
      const monthData = monthlyExpenses.find(expense => monthLabel(expense.month) === month);
      return {
        month,
        [ESSENTIAL_KEY]: monthData?.getEssentialAmount(converter) ?? 0,
        [NON_ESSENTIAL_KEY]: monthData?.getNonEssentialAmount(converter) ?? 0,
        [AVERAGE_KEY]: average,
      };
    });

    const barSeries = [
      {
        dataKey: ESSENTIAL_KEY,
        label: 'Essential',
        stack: 'total',
        color: theme.palette.primary.main,
        type: 'bar' as const,
      },
      {
        dataKey: NON_ESSENTIAL_KEY,
        label: 'Non-essential',
        stack: 'total',
        color: theme.palette.primary.light,
        type: 'bar' as const,
      },
    ];

    const lineSeries = [
      {
        dataKey: AVERAGE_KEY,
        label: 'Average total',
        color: theme.palette.grey[600],
        type: 'line' as const,
      },
    ];

    return { data, barSeries, lineSeries, displayMonths };
  }, [monthlyExpenses, converter, isMobile, monthLabel, theme.palette]);

  const formatMonthLabel = React.useCallback(
    (month: string) => {
      const date = new Date(month + '-01');
      return date.toLocaleDateString('en-US', {
        month: 'short',
        year: isMobile ? undefined : '2-digit',
      });
    },
    [isMobile]
  );

  const tooltipFormatter = React.useCallback(
    (params: {
      dataIndex?: number;
      series?: Array<{ value: number; color: string; label: string; type: string }>;
    }) => {
      if (!params || typeof params.dataIndex !== 'number') return null;

      const monthData = chartData.data[params.dataIndex];
      const month = formatMonthLabel(monthData.month as string);

      return (
        <Box
          sx={{
            p: 1,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Box sx={{ fontWeight: 'bold', mb: 1 }}>{month}</Box>
          {params.series?.map((serie, index: number) => {
            if (serie.value === 0) return null;

            return (
              <Box key={index} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    bgcolor: serie.color,
                    borderRadius: serie.type === 'line' ? '50%' : 0,
                  }}
                />
                <Box>
                  {serie.label}: {UIUtils.formatCurrency(serie.value, currency)}
                </Box>
              </Box>
            );
          })}
        </Box>
      );
    },
    [chartData.data, formatMonthLabel, currency]
  );

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

  const minChartWidth = chartData.displayMonths.length * 80;
  const chartWidth = Math.max(minChartWidth, isMobile ? 350 : 800);

  return (
    <Box
      sx={{
        width: '100%',
        height: isMobile ? 350 : 500,
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
              categoryGapRatio: 0.3,
              barGapRatio: 0.1,
            },
          ]}
          yAxis={[{}]}
          height={isMobile ? 350 : 500}
          width={chartWidth}
          margin={{
            left: 80,
            right: 30,
            top: 30,
            bottom: 100,
          }}
        >
          <BarPlot />
          <LinePlot />
          <ChartsXAxis />
          <ChartsYAxis />
          <ChartsTooltip trigger="item" formatter={tooltipFormatter} />
          <ChartsLegend />
        </ChartContainer>
      </Box>
    </Box>
  );
}
