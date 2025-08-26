import { Expense } from '@/domain/entities/expenses/Expense';
import { Logger } from '@/domain/utils/Logger';
import React from 'react';
import { ExpenseService } from '../../domain/services/ExpenseService';
import { ExpensesPage } from '../components/Pages/ExpensesPage';
import { ExpenseFormContainer } from './ExpenseFormContainer';
import { ScheduledExpenseContainer } from './ScheduledExpenseContainer';

export function ExpensesContainer() {
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [expenseToEdit, setExpenseToEdit] = React.useState<Expense | undefined>();
  const [scheduledExpenseDialogOpen, setScheduledExpenseDialogOpen] = React.useState(false);

  const expenseService = React.useMemo(() => new ExpenseService(), []);

  const loadExpenses = React.useCallback(async () => {
    try {
      setLoading(true);
      const allExpenses = await expenseService.getAllExpenses();
      setExpenses(allExpenses);
    } catch (error) {
      Logger.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [expenseService]);

  React.useEffect(() => {
    loadExpenses();
  }, [loadExpenses]);

  const handleAddExpense = () => {
    setExpenseToEdit(undefined);
    setFormOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    setExpenseToEdit(expense);
    setFormOpen(true);
  };

  const handleDeleteExpense = async (expense: Expense) => {
    if (!expense.id) return;

    try {
      await expenseService.deleteExpense(expense.id);
      await loadExpenses();
    } catch (error) {
      Logger.error('Failed to delete expense:', error);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setExpenseToEdit(undefined);
  };

  const handleFormSave = async () => {
    setFormOpen(false);
    setExpenseToEdit(undefined);
    await loadExpenses();
  };

  const handleManageScheduledExpenses = () => {
    setScheduledExpenseDialogOpen(true);
  };

  const handleScheduledExpenseDialogClose = () => {
    setScheduledExpenseDialogOpen(false);
    // Reload expenses in case new scheduled expenses were generated
    loadExpenses();
  };

  return (
    <>
      <ExpensesPage
        expenses={expenses}
        monthlyData={[]}
        currencyTotals={[]}
        onAddExpense={handleAddExpense}
        onEditExpense={handleEditExpense}
        onDeleteExpense={handleDeleteExpense}
        onManageScheduledExpenses={handleManageScheduledExpenses}
        loading={loading}
      />

      <ExpenseFormContainer
        open={formOpen}
        onClose={handleFormClose}
        onSave={handleFormSave}
        expenseToEdit={expenseToEdit}
      />

      <ScheduledExpenseContainer
        open={scheduledExpenseDialogOpen}
        onClose={handleScheduledExpenseDialogClose}
      />
    </>
  );
}
