import { ExpenseFormDialog } from '@/app/components/dialogs/ExpenseFormDialog';
import { Expense, IExpense } from '@/domain/entities/expenses/Expense';
import { ExpenseCategory } from '@/domain/entities/expenses/ExpenseCategory';
import { Currency } from '@/domain/entities/shared/Currency';
import { ExpenseService } from '@/domain/services/ExpenseService';
import { Logger } from '@/domain/utils/Logger';
import { useEffect, useMemo, useState } from 'react';

export interface ExpenseFormContainerProps {
  open: boolean;
  expenseToEdit?: Expense | undefined;
  onClose: () => void;
  onSuccess: () => void;
}

export function ExpenseFormContainer({
  open,
  expenseToEdit,
  onClose,
  onSuccess,
}: ExpenseFormContainerProps) {
  const initialExpense: IExpense = useMemo(
    () => ({
      id: expenseToEdit?.id || undefined,
      amount: expenseToEdit?.amount || 0,
      currency: expenseToEdit?.currency || Currency.INR,
      date: expenseToEdit?.date || new Date(),
      category: expenseToEdit?.category || ExpenseCategory.OTHER,
      isEssential: expenseToEdit?.isEssential !== undefined ? expenseToEdit?.isEssential : false,
      description: expenseToEdit?.description || '',
    }),
    [expenseToEdit]
  );

  const [expense, setExpense] = useState<IExpense>(initialExpense);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const expenseService = useMemo(() => new ExpenseService(), []);

  useEffect(() => {
    if (open) {
      setExpense(initialExpense);
    }
  }, [open, initialExpense]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const expenseEntity = new Expense({
        id: expense.id,
        amount: expense.amount,
        currency: expense.currency,
        date: new Date(expense.date),
        category: expense.category,
        isEssential: expense.isEssential,
        description: expense.description,
      });

      if (expenseToEdit) {
        await expenseService.updateExpense(expenseEntity);
      } else {
        await expenseService.createExpense(expenseEntity);
      }

      onSuccess();
      onClose();
    } catch (error) {
      Logger.error('Failed to save expense:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = expenseToEdit ? 'Edit Expense' : 'Add Expense';

  return (
    <ExpenseFormDialog
      open={open}
      title={title}
      formData={expense}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={handleSubmit}
      onFormDataChange={setExpense}
    />
  );
}
