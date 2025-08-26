import { Expense, IExpense } from '@/domain/entities/expenses/Expense';
import { Logger } from '@/domain/utils/Logger';
import React from 'react';
import { ExpenseService } from '../../domain/services/ExpenseService';
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
  const expenseService = React.useMemo(() => new ExpenseService(), []);

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

      const expenseData: IExpense = {
        id: expenseToEdit?.id,
        amount: parseFloat(formData.amount),
        currency: formData.currency.trim().toUpperCase(),
        date: new Date(formData.date),
        category: formData.category,
        isEssential: formData.isEssential,
        description: formData.description.trim(),
      };

      await expenseService.createExpense(expenseData);

      onSave();
    } catch (error) {
      Logger.error('Failed to save expense:', error);
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
