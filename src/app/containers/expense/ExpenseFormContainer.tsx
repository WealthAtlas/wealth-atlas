import { useCurrency } from '@/app/components/providers/CurrencyContext';
import { ExpenseFormDialog } from '@/app/components/dialogs/ExpenseFormDialog';
import { Expense, IExpense } from '@/domain/entities/expenses/Expense';
import { ExpenseCategory } from '@/domain/entities/expenses/ExpenseCategory';
import { ExpenseService } from '@/domain/services/ExpenseService';
import { Logger } from '@/domain/utils/Logger';
import { useEffect, useMemo, useState } from 'react';

export interface ExpenseFormContainerProps {
  open: boolean;
  expenseToEdit?: Expense | undefined;
  onClose: () => void;
}

export function ExpenseFormContainer({ open, expenseToEdit, onClose }: ExpenseFormContainerProps) {
  const { baseCurrency, currencies } = useCurrency();
  const initialExpense: IExpense = useMemo(
    () => ({
      id: expenseToEdit?.id || undefined,
      amount: expenseToEdit?.amount || 0,
      currency: expenseToEdit?.currency || baseCurrency,
      date: expenseToEdit?.date || new Date(),
      category: expenseToEdit?.category || ExpenseCategory.OTHER,
      isEssential: expenseToEdit?.isEssential !== undefined ? expenseToEdit?.isEssential : true,
      description: expenseToEdit?.description || '',
    }),
    [expenseToEdit, baseCurrency]
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
    } catch (error) {
      Logger.error('Failed to save expense:', error);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const title = expenseToEdit ? 'Edit Expense' : 'Add Expense';

  return (
    <ExpenseFormDialog
      currencies={currencies}
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
