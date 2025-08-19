import { ExpenseRepository } from '@/data/repositories/ExpenseRepository';
import { Expense } from '@/domain/entities/expenses/Expense';
import React from 'react';
import { ExpenseFormData, ExpenseFormDialog } from '../components/Forms/ExpenseFormDialog';

interface ExpenseFormContainerProps {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  expenseToEdit?: Expense;
}

export function ExpenseFormContainer({
  open,
  onClose,
  onSave,
  expenseToEdit,
}: ExpenseFormContainerProps) {
  const [loading, setLoading] = React.useState(false);
  const expenseRepository = React.useMemo(() => new ExpenseRepository(), []);

  const getInitialData = (): ExpenseFormData | undefined => {
    if (!expenseToEdit) return undefined;

    return {
      amount: expenseToEdit.amount.toString(),
      currency: expenseToEdit.currency,
      date: expenseToEdit.date.toISOString().split('T')[0],
      category: expenseToEdit.category,
      isEssential: expenseToEdit.isEssential,
      description: expenseToEdit.description || '',
    };
  };

  const handleSave = async (formData: ExpenseFormData) => {
    if (loading) return;

    try {
      setLoading(true);

      const expenseData = {
        id: expenseToEdit?.id,
        amount: parseFloat(formData.amount),
        currency: formData.currency.trim().toUpperCase(),
        date: new Date(formData.date),
        category: formData.category,
        isEssential: formData.isEssential,
        description: formData.description.trim() || undefined,
      };

      const expense = new Expense(expenseData);
      await expenseRepository.save(expense);

      onSave();
    } catch (error) {
      console.error('Failed to save expense:', error);
      // TODO: Add proper error handling/notification
    } finally {
      setLoading(false);
    }
  };

  const title = expenseToEdit ? 'Edit Expense' : 'Add Expense';

  return (
    <ExpenseFormDialog
      open={open}
      onClose={onClose}
      onSave={handleSave}
      initialData={getInitialData()}
      title={title}
    />
  );
}
