import { Box, Divider, FormControl, InputLabel, MenuItem, Select, Typography } from '@mui/material';
import React from 'react';
import { MonthlyExpense } from '../../../domain/entities/expenses/MonthlyExpense';
import { Currency } from '../../../domain/entities/shared/Currency';
import { ExpenseCategoryChart } from './ExpenseCategoryChart';
import { ExpenseChart } from './MonthlyExpenseChart';

/**
 * Both expense charts under one currency choice.
 *
 * Expenses are never converted, so every chart here is a single-currency chart.
 * That was first done by drawing the trend once per currency, which stacked up
 * and left the pie asking the same question again with its own picker. One
 * selector at the top answers it once for both, and the picker is hidden
 * entirely for the ordinary case of a single currency.
 *
 * Selection state is held here rather than in a container, matching the month
 * picker this replaces: it is a view preference, and no service is involved.
 */
export interface ExpenseChartsViewProps {
  monthlyExpenses: MonthlyExpense[];
  /** Every currency spent in, largest first — supplied by the container. */
  currencies: Currency[];
}

function monthKeyOf(month: Date): string {
  return month.toISOString().substring(0, 7); // YYYY-MM
}

export function ExpenseChartsView({ monthlyExpenses, currencies }: ExpenseChartsViewProps) {
  const [selectedCurrency, setSelectedCurrency] = React.useState<Currency | ''>('');

  // Falls back to the largest currency whenever the chosen one is no longer
  // spent in — deleting the last USD expense must not blank the charts.
  const currency = currencies.includes(selectedCurrency) ? selectedCurrency : (currencies[0] ?? '');

  // Only months with spending in this currency, so the picker cannot land on an
  // empty pie. The trend chart still spans every month: there, a month with
  // nothing spent in this currency is a real zero worth seeing.
  const availableMonths = React.useMemo(
    () =>
      monthlyExpenses
        .filter(month => !currency || month.getTotalAmount(currency) > 0)
        .map(month => ({
          date: month.month,
          display: month.month.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            timeZone: 'UTC',
          }),
          key: monthKeyOf(month.month),
        }))
        .sort((a, b) => b.date.getTime() - a.date.getTime()), // Most recent first
    [monthlyExpenses, currency]
  );

  const defaultMonthKey = React.useCallback(() => {
    const thisMonth = new Date().toISOString().substring(0, 7);
    const hasThisMonth = availableMonths.some(month => month.key === thisMonth);
    return hasThisMonth ? thisMonth : (availableMonths[0]?.key ?? '');
  }, [availableMonths]);

  const [selectedMonth, setSelectedMonth] = React.useState('');

  // Re-seeds when the data changes, and when switching currency drops the month
  // that was selected.
  React.useEffect(() => {
    if (!selectedMonth || !availableMonths.some(month => month.key === selectedMonth)) {
      setSelectedMonth(defaultMonthKey());
    }
  }, [availableMonths, selectedMonth, defaultMonthKey]);

  const selectedMonthlyExpense = React.useMemo(
    () => monthlyExpenses.find(month => monthKeyOf(month.month) === selectedMonth),
    [monthlyExpenses, selectedMonth]
  );

  if (!currency) {
    return (
      <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
        <Typography variant="body1">No expense data available</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {currencies.length > 1 && (
        <FormControl sx={{ minWidth: 160, mb: 3 }}>
          <InputLabel>Currency</InputLabel>
          <Select
            value={currency}
            label="Currency"
            onChange={e => setSelectedCurrency(e.target.value)}
          >
            {currencies.map(code => (
              <MenuItem key={code} value={code}>
                {code}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <Typography variant="h6" gutterBottom>
        Monthly Expense Trends
      </Typography>
      <ExpenseChart monthlyExpenses={monthlyExpenses} currency={currency} />

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>
        Expense Categories
      </Typography>
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
      <ExpenseCategoryChart monthlyExpense={selectedMonthlyExpense} currency={currency} />
    </Box>
  );
}
