import {
  Alert,
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
import { CurrencyConverter } from '../../../domain/entities/shared/CurrencyConverter';
import { UIUtils } from '../../utils/UIUtils';

export interface ExpenseCategoryChartProps {
  monthlyExpenses: MonthlyExpense[];
  /** Categories are totalled in the base currency, not once per currency. */
  currency: Currency;
  converter: CurrencyConverter;
}

interface CategoryData {
  id: string;
  value: number;
  label: string;
}

export function ExpenseCategoryChart({
  monthlyExpenses,
  currency,
  converter,
}: ExpenseCategoryChartProps) {
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

  const categoryData = React.useMemo((): CategoryData[] => {
    if (!selectedMonthlyExpense) return [];

    return selectedMonthlyExpense
      .getAllCategories()
      .map(category => ({
        id: category,
        value: selectedMonthlyExpense.getCategoryTotal(converter, category),
        label: category,
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value); // Sort by amount descending
  }, [selectedMonthlyExpense, converter]);

  const unratedCurrencies = React.useMemo(
    () => selectedMonthlyExpense?.getUnratedCurrencies(converter) ?? [],
    [selectedMonthlyExpense, converter]
  );

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

  if (!selectedMonthlyExpense || categoryData.length === 0) {
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

  const colors = getCategoryColors();
  const totalAmount = categoryData.reduce((sum, item) => sum + item.value, 0);

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

      {unratedCurrencies.length > 0 && (
        <Alert severity="warning" variant="outlined" sx={{ mb: 2 }}>
          Expenses in {unratedCurrencies.join(', ')} are counted as zero — no exchange rate set.
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box>
            <Typography variant="h6" gutterBottom>
              Expense Categories
            </Typography>
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
        </Grid>
      </Grid>
    </Box>
  );
}
