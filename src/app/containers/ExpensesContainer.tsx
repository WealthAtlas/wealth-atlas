import { ExpenseRepository } from '@/data/repositories/ExpenseRepository';
import { Expense } from '@/domain/entities/expenses/Expense';
import { ExpenseAnalyticsService } from '@/domain/services/ExpenseAnalyticsService';
import { ScheduledExpenseService } from '@/domain/services/ScheduledExpenseService';
import React from 'react';
import { seedExpenseData } from '../../utils/seedExpenseData';
import { seedScheduledExpenseData } from '../../utils/seedScheduledExpenseData';
import { ExpensesPage } from '../components/Pages/ExpensesPage';
import { ExpenseFormContainer } from './ExpenseFormContainer';
import { ScheduledExpenseContainer } from './ScheduledExpenseContainer';

export function ExpensesContainer() {
  const [expenses, setExpenses] = React.useState<Expense[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [expenseToEdit, setExpenseToEdit] = React.useState<Expense | undefined>();
  const [scheduledExpenseDialogOpen, setScheduledExpenseDialogOpen] = React.useState(false);

  const expenseRepository = React.useMemo(() => new ExpenseRepository(), []);
  const scheduledExpenseService = React.useMemo(() => new ScheduledExpenseService(), []);

  const loadExpenses = React.useCallback(async () => {
    try {
      setLoading(true);

      // Seed scheduled expenses data if none exist
      await seedScheduledExpenseData();

      // Process scheduled expenses first (auto-generation)
      await scheduledExpenseService.processScheduledExpenses();

      // Seed sample data if no expenses exist
      await seedExpenseData();
      const allExpenses = await expenseRepository.findAll();
      setExpenses(allExpenses);
    } catch (error) {
      console.error('Failed to load expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [expenseRepository, scheduledExpenseService]);

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
      await expenseRepository.delete(expense.id);
      await loadExpenses();
    } catch (error) {
      console.error('Failed to delete expense:', error);
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

  // Calculate analytics data
  const monthlyData = React.useMemo(() => {
    return ExpenseAnalyticsService.getMonthlyExpenseSummary(expenses);
  }, [expenses]);

  const currencyTotals = React.useMemo(() => {
    return ExpenseAnalyticsService.getCurrencyTotalSummary(expenses);
  }, [expenses]);

  return (
    <>
      <ExpensesPage
        expenses={expenses}
        monthlyData={monthlyData}
        currencyTotals={currencyTotals}
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
