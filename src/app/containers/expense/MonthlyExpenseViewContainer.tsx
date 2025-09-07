import { MonthlyExpense } from '@/domain/entities/expenses/MonthlyExpense';
import React from 'react';
import { MonthlyExpenseView } from '../../components/views/MonthlyExpenseView';

export interface MonthlyExpenseViewContainerProps {
  monthlyExpense: MonthlyExpense;
  deleteExpense: (id: number) => void;
  refresh: () => void;
}

export function MonthlyExpenseViewContainer({
  monthlyExpense,
  deleteExpense,
  refresh,
}: MonthlyExpenseViewContainerProps) {
  const [localMonthlyExpense] = React.useState<MonthlyExpense>(monthlyExpense);

  return (
    <>
      <MonthlyExpenseView
        key={monthlyExpense.month.toISOString()}
        monthlyExpense={localMonthlyExpense}
        deleteExpense={deleteExpense}
        refresh={refresh}
      />
    </>
  );
}
