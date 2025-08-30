import { Expense } from '@/domain/entities/expenses/Expense';
import { Logger } from '@/domain/utils/Logger';
import React from 'react';
import { ExpenseView } from '../../components/views/ExpenseView';
import { ExpenseService } from '../../../domain/services/ExpenseService';

export interface ExpenseViewContainerProps {
  expense: Expense;
  refresh: () => void;
}

export function ExpenseViewContainer({ expense, refresh }: ExpenseViewContainerProps) {
  const expenseService = React.useMemo(() => new ExpenseService(), []);

  const handleDeleteExpense = async () => {
    try {
      await expenseService.deleteExpense(expense.id!);
      refresh();
    } catch (error) {
      Logger.error('Failed to delete expense:', error);
    }
  };

  return (
    <ExpenseView
      key={expense.id}
      expense={expense}
      deleteExpense={handleDeleteExpense}
      refresh={refresh}
    />
  );
}
