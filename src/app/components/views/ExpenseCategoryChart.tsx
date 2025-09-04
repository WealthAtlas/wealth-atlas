import {
  Box,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { PieChart } from '@mui/x-charts';
import React from 'react';
import { MonthlyExpense } from '../../../domain/entities/expenses/MonthlyExpense';
import { Currency } from '../../../domain/entities/shared/Currency';

export interface ExpenseCategoryChartProps {
  monthlyExpenses: MonthlyExpense[];
}

interface CategoryData {
  id: string;
  value: number;
  label: string;
}

export function ExpenseCategoryChart({ monthlyExpenses }: ExpenseCategoryChartProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const availableMonths = React.useMemo(() => {
    const months = monthlyExpenses
      .map(me => ({
        date: me.month,
        display: me.month.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
        key: me.month.toISOString().substring(0, 7), // YYYY-MM format
      }))
      .sort((a, b) => b.date.getTime() - a.date.getTime()); // Most recent first

    return months;
  }, [monthlyExpenses]);

  const getCurrentMonthKey = React.useCallback(() => {
    const currentMonth = new Date().toISOString().substring(0, 7);
    const hasCurrentMonthData = availableMonths.some(month => month.key === currentMonth);
    return hasCurrentMonthData ? currentMonth : availableMonths[0]?.key || '';
  }, [availableMonths]);

  const [selectedMonth, setSelectedMonth] = React.useState(getCurrentMonthKey());

  // Update selectedMonth when data changes
  React.useEffect(() => {
    if (!selectedMonth || !availableMonths.some(month => month.key === selectedMonth)) {
      setSelectedMonth(getCurrentMonthKey());
    }
  }, [availableMonths, selectedMonth, getCurrentMonthKey]);

  const selectedMonthlyExpense = React.useMemo(() => {
    return monthlyExpenses.find(me => me.month.toISOString().substring(0, 7) === selectedMonth);
  }, [monthlyExpenses, selectedMonth]);

  const categoryDataByCurrency = React.useMemo(() => {
    if (!selectedMonthlyExpense) return new Map<Currency, CategoryData[]>();

    const currencyMap = new Map<Currency, CategoryData[]>();
    const expensesByCurrency = selectedMonthlyExpense.getExpensesByCurrency();

    expensesByCurrency.forEach((expenses, currency) => {
      const categoryTotals = new Map<string, number>();

      expenses.forEach(expense => {
        const currentTotal = categoryTotals.get(expense.category) || 0;
        categoryTotals.set(expense.category, currentTotal + expense.amount);
      });

      const categoryData: CategoryData[] = Array.from(categoryTotals.entries())
        .map(([category, amount]) => ({
          id: category,
          value: amount,
          label: category,
        }))
        .sort((a, b) => b.value - a.value); // Sort by amount descending

      currencyMap.set(currency, categoryData);
    });

    return currencyMap;
  }, [selectedMonthlyExpense]);

  const getCategoryColors = React.useCallback(() => {
    return [
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
    ];
  }, [theme]);

  if (availableMonths.length === 0) {
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

  if (!selectedMonthlyExpense || categoryDataByCurrency.size === 0) {
    return (
      <Box>
        <FormControl sx={{ minWidth: 200, mb: 3 }}>
          <InputLabel>Select Month</InputLabel>
          <Select
            value={selectedMonth}
            label="Select Month"
            onChange={e => setSelectedMonth(e.target.value)}
          >
            {availableMonths.map(month => (
              <MenuItem key={month.key} value={month.key}>
                {month.display}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Box
          sx={{
            height: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'text.secondary',
          }}
        >
          No expenses found for the selected month
        </Box>
      </Box>
    );
  }

  const currencies = Array.from(categoryDataByCurrency.keys());
  const colors = getCategoryColors();

  return (
    <Box>
      <FormControl sx={{ minWidth: 200, mb: 3 }}>
        <InputLabel>Select Month</InputLabel>
        <Select
          value={selectedMonth}
          label="Select Month"
          onChange={e => setSelectedMonth(e.target.value)}
        >
          {availableMonths.map(month => (
            <MenuItem key={month.key} value={month.key}>
              {month.display}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <Grid container spacing={3}>
        {currencies.map(currency => {
          const categoryData = categoryDataByCurrency.get(currency) || [];
          const totalAmount = categoryData.reduce((sum, item) => sum + item.value, 0);

          return (
            <Grid item xs={12} md={currencies.length > 1 ? 6 : 12} key={currency}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  {currencies.length > 1 ? `${currency} Categories` : 'Expense Categories'}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Total: {currency} {totalAmount.toLocaleString()}
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
                        valueFormatter: value => `${currency} ${value.value.toLocaleString()}`,
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
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}
