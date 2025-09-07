import React, { useState } from 'react';
import { Expense } from '../../../domain/entities/expenses/Expense';
import { ExpenseCardView } from '../../components/views/ExpenseCardView';

export interface ExpenseCardContainerProps {
  expense: Expense;
  deleteExpense: (id: number) => void;
  refresh: () => void;
}

export function ExpenseCardContainer({
  expense,
  deleteExpense,
  refresh,
}: ExpenseCardContainerProps) {
  const [localExpense] = React.useState<Expense>(expense);
  const [showExpenseEdit, setShowExpenseEdit] = useState<boolean>(false);

  return (
    <>
      <ExpenseCardView
        key={localExpense.id}
        expense={localExpense}
        showExpenseEdit={showExpenseEdit}
        setShowExpenseEdit={setShowExpenseEdit}
        deleteExpense={deleteExpense}
        refresh={refresh}
      />
    </>
  );
}
