import { ExpensesPage } from '@/app/components/pages/ExpensePage';
import { MonthlyExpense } from '@/domain/entities/expenses/MonthlyExpense';
import { ExpenseService } from '@/domain/services/ExpenseService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useState } from 'react';

export function ExpensesContainer() {
  const [monthlyExpenses, setMonthlyExpenses] = useState<MonthlyExpense[]>([]);
  const [showAddExpense, setShowAddExpense] = React.useState(false);
  const expenseService = React.useMemo(() => new ExpenseService(), []);

  const loadExpenses = useCallback(async () => {
    try {
      const loadedMonthlyExpenses = await expenseService.getMonthlyExpenses();
      setMonthlyExpenses(loadedMonthlyExpenses);
    } catch (error) {
      Logger.error('Failed to load expenses:', error);
    }
  }, [expenseService]);

  const deleteExpense = useCallback(
    async (id: number) => {
      try {
        await expenseService.deleteExpense(id);
        await loadExpenses();
      } catch (error) {
        Logger.error('Failed to delete expense:', error);
      }
    },
    [expenseService, loadExpenses]
  );

  useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  return (
    <>
      <ExpensesPage
        monthlyExpenses={monthlyExpenses}
        showAddExpense={showAddExpense}
        setShowAddExpense={setShowAddExpense}
        deleteExpense={deleteExpense}
        refresh={loadExpenses}
      />
    </>
  );
}
