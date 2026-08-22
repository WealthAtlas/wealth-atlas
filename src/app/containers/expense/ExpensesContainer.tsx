import { ExpensesPage } from '@/app/components/pages/ExpensePage';
import { useDatabaseReplaced } from '@/app/utils/useDatabaseReplaced';
import { MonthlyExpense } from '@/domain/entities/expenses/MonthlyExpense';
import { expenseCurrencies, ExpenseService } from '@/domain/services/ExpenseService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

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

  // A sync pull replaces every row, including these.
  useDatabaseReplaced(() => void loadExpenses());

  // Expenses are reported in the currency they were paid in, so the page needs
  // the list of currencies rather than a base currency and a converter.
  const currencies = useMemo(() => expenseCurrencies(monthlyExpenses), [monthlyExpenses]);

  return (
    <>
      <ExpensesPage
        monthlyExpenses={monthlyExpenses}
        currencies={currencies}
        showAddExpense={showAddExpense}
        setShowAddExpense={setShowAddExpense}
        deleteExpense={deleteExpense}
        refresh={loadExpenses}
      />
    </>
  );
}
