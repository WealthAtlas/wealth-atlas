import { MonthlyExpense } from '@/domain/entities/expenses/MonthlyExpense';
import React, { useCallback, useEffect, useMemo } from 'react';
import { ExpenseService } from '../../../domain/services/ExpenseService';
import { MonthlyExpenseView } from '../../components/views/MonthlyExpenseView';

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

  return (
    <>
      {monthlyExpense && (
        <MonthlyExpenseView
          key={monthlyExpense?.month.toISOString()}
          monthlyExpense={monthlyExpense}
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
