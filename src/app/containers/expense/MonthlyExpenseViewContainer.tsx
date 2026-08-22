import { useDatabaseReplaced } from '@/app/utils/useDatabaseReplaced';
import { MonthlyExpense } from '@/domain/entities/expenses/MonthlyExpense';
import React, { useCallback, useEffect, useMemo } from 'react';
import { ExpenseService } from '../../../domain/services/ExpenseService';
import {
  MonthlyCurrencyTotals,
  MonthlyExpenseView,
} from '../../components/views/MonthlyExpenseView';

export interface MonthlyExpenseViewContainerProps {
  month: Date;
  deleteExpense: (id: number) => void;
  refresh: () => void;
}

export function MonthlyExpenseViewContainer({
  month,
  deleteExpense,
  refresh,
}: MonthlyExpenseViewContainerProps) {
  const [monthlyExpense, setMonthlyExpense] = React.useState<MonthlyExpense | undefined>(undefined);
  const expenseService = useMemo(() => new ExpenseService(), []);

  const fetchMonthlyExpense = useCallback(() => {
    expenseService.getMonthlyExpenses().then(loadedExpenses => {
      setMonthlyExpense(
        loadedExpenses.find(
          expense => new Date(expense.month).toISOString() === month.toISOString()
        )
      );
    });
  }, [expenseService, month]);

  useEffect(() => {
    fetchMonthlyExpense();
  }, [fetchMonthlyExpense]);

  // This card holds what it read on mount, and a sync pull replaces every row.
  // It no longer re-renders off `useCurrency`, which used to hide the gap.
  useDatabaseReplaced(fetchMonthlyExpense);

  // One set of totals per currency spent this month. Expenses are not converted,
  // so nothing here changes when the base currency or a rate does.
  const currencyTotals: MonthlyCurrencyTotals[] = useMemo(() => {
    if (!monthlyExpense) return [];

    return monthlyExpense.getCurrencies().map(currency => ({
      currency,
      total: monthlyExpense.getTotalAmount(currency),
      essential: monthlyExpense.getEssentialAmount(currency),
      nonEssential: monthlyExpense.getNonEssentialAmount(currency),
    }));
  }, [monthlyExpense]);

  return (
    <>
      {monthlyExpense && (
        <MonthlyExpenseView
          key={monthlyExpense?.month.toISOString()}
          monthlyExpense={monthlyExpense}
          currencyTotals={currencyTotals}
          deleteExpense={deleteExpense}
          refresh={() => {
            fetchMonthlyExpense();
            refresh();
          }}
        />
      )}
    </>
  );
}
