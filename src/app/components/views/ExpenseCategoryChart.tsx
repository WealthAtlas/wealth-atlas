import { Box, Typography, useMediaQuery, useTheme } from '@mui/material';
import { PieChart } from '@mui/x-charts';
import React from 'react';
import { MonthlyExpense } from '../../../domain/entities/expenses/MonthlyExpense';
import { Currency } from '../../../domain/entities/shared/Currency';
import { UIUtils } from '../../utils/UIUtils';

export interface ExpenseCategoryChartProps {
  /** The month to break down, or undefined when nothing is selected. */
  monthlyExpense: MonthlyExpense | undefined;
  /**
   * The one currency to slice. A pie needs its slices to share a unit, and
   * expenses are never converted, so the currency is chosen by the caller rather
   * than blended from several.
   */
  currency: Currency;
}

interface CategoryData {
  id: string;
  value: number;
  label: string;
}

export function ExpenseCategoryChart({ monthlyExpense, currency }: ExpenseCategoryChartProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const categoryData = React.useMemo((): CategoryData[] => {
    if (!monthlyExpense) return [];

    return monthlyExpense
      .getCategories(currency)
      .map(category => ({
        id: category,
        value: monthlyExpense.getCategoryTotal(currency, category),
        label: category,
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value); // Sort by amount descending
  }, [monthlyExpense, currency]);

  const colors = React.useMemo(
    () => [
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
      theme.palette.error.light,
      theme.palette.info.light,
      theme.palette.primary.dark,
      theme.palette.secondary.dark,
      theme.palette.success.dark,
      theme.palette.warning.dark,
      theme.palette.error.dark,
      theme.palette.info.dark,
    ],
    [theme]
  );

  if (categoryData.length === 0) {
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
        No {currency} expenses in the selected month
      </Box>
    );
  }

  const totalAmount = categoryData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" gutterBottom>
        Total: {UIUtils.formatCurrency(totalAmount, currency)}
      </Typography>

      <Box
        sx={{
          height: isMobile ? 300 : 400,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <PieChart
          series={[
            {
              data: categoryData,
              valueFormatter: value => UIUtils.formatCurrency(value.value, currency),
            },
          ]}
          colors={colors}
          width={isMobile ? 350 : 450}
          height={isMobile ? 300 : 400}
          margin={{
            top: 20,
            bottom: 20,
            left: 20,
            right: 20,
          }}
        />
      </Box>
    </Box>
  );
}
