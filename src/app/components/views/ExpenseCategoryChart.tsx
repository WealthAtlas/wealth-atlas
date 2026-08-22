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
import { UIUtils } from '../../utils/UIUtils';

/**
 * Categories for one month in one currency.
 *
 * A pie is a single-currency shape by nature — its slices have to share a unit
 * to mean anything — and expenses are never converted, so the currency is picked
 * rather than blended. The selector only appears for a month spent in more than
 * one, which is the uncommon case.
 */
export interface ExpenseCategoryChartProps {
  monthlyExpenses: MonthlyExpense[];
}

interface CategoryData {
  id: string;
  value: number;
  label: string;
}

interface MonthOption {
  key: string;
  display: string;
}

/**
 * Month, plus currency when the month has more than one. Extracted because the
 * chart returns early for an empty month and the selectors have to stay put.
 */
function ChartSelectors({
  months,
  selectedMonth,
  onSelectMonth,
  currencies,
  currency,
  onSelectCurrency,
}: {
  months: MonthOption[];
  selectedMonth: string;
  onSelectMonth: (month: string) => void;
  currencies: Currency[];
  currency: Currency | '';
  onSelectCurrency: (currency: Currency) => void;
}) {
  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 3 }}>
      <FormControl sx={{ minWidth: 200 }}>
        <InputLabel>Select Month</InputLabel>
        <Select
          value={selectedMonth}
          label="Select Month"
          onChange={e => onSelectMonth(e.target.value)}
        >
          {months.map(month => (
            <MenuItem key={month.key} value={month.key}>
              {month.display}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {currencies.length > 1 && (
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Currency</InputLabel>
          <Select
            value={currency}
            label="Currency"
            onChange={e => onSelectCurrency(e.target.value)}
          >
            {currencies.map(code => (
              <MenuItem key={code} value={code}>
                {code}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}
    </Box>
  );
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

  const availableCurrencies = React.useMemo(
    () => selectedMonthlyExpense?.getCurrencies() ?? [],
    [selectedMonthlyExpense]
  );

  const [selectedCurrency, setSelectedCurrency] = React.useState<Currency | ''>('');

  // Falls back to the month's largest currency whenever the chosen one is not
  // spent in the selected month — changing month must not blank the chart.
  const currency = availableCurrencies.includes(selectedCurrency)
    ? selectedCurrency
    : (availableCurrencies[0] ?? '');

  const categoryData = React.useMemo((): CategoryData[] => {
    if (!selectedMonthlyExpense || !currency) return [];

    return selectedMonthlyExpense
      .getCategories(currency)
      .map(category => ({
        id: category,
        value: selectedMonthlyExpense.getCategoryTotal(currency, category),
        label: category,
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value); // Sort by amount descending
  }, [selectedMonthlyExpense, currency]);

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
        <ChartSelectors
          months={availableMonths}
          selectedMonth={selectedMonth}
          onSelectMonth={setSelectedMonth}
          currencies={availableCurrencies}
          currency={currency}
          onSelectCurrency={setSelectedCurrency}
        />
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
      <ChartSelectors
        months={availableMonths}
        selectedMonth={selectedMonth}
        onSelectMonth={setSelectedMonth}
        currencies={availableCurrencies}
        currency={currency}
        onSelectCurrency={setSelectedCurrency}
      />

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {availableCurrencies.length > 1
                ? `Expense Categories (${currency})`
                : 'Expense Categories'}
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
