import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Expense } from '../../../domain/entities/expenses/Expense';
import { ExpenseService } from '../../../domain/services/ExpenseService';
import { ExpenseCardView } from '../../components/views/ExpenseCardView';

export interface ExpenseCardContainerProps {
  expenseId: number;
  deleteExpense: (id: number) => void;
  refresh: () => void;
}

export function ExpenseCardContainer({
  expenseId,
  deleteExpense,
  refresh,
}: ExpenseCardContainerProps) {
  const [expense, setExpense] = React.useState<Expense | null>(null);
  const [showExpenseEdit, setShowExpenseEdit] = useState<boolean>(false);
  const expenseService = useMemo(() => new ExpenseService(), []);

  const fetchExpense = useCallback(() => {
    expenseService.getExpenseById(expenseId).then(updatedExpense => {
      setExpense(updatedExpense);
    });
  }, [expenseId, expenseService]);

  useEffect(() => {
    fetchExpense();
  }, [expenseId, fetchExpense]);

  return (
    <>
      {expense && (
        <ExpenseCardView
          key={expense.id}
          expense={expense}
          showExpenseEdit={showExpenseEdit}
          setShowExpenseEdit={setShowExpenseEdit}
          deleteExpense={deleteExpense}
          refresh={() => {
            fetchExpense();
            refresh();
          }}
        />
      )}
    </>
  );
}
