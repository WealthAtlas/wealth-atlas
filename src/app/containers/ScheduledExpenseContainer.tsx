import { ScheduledExpense } from '@/domain/entities/expenses/ScheduledExpense';
import { ScheduledExpenseService } from '@/domain/services/ScheduledExpenseService';
import React from 'react';
import { ScheduledExpenseListDialog } from '../components/Dialogs/ScheduledExpenseListDialog';
import { ScheduledExpenseFormDialog } from '../components/Forms/ScheduledExpenseFormDialog';

interface ScheduledExpenseContainerProps {
  open: boolean;
  onClose: () => void;
}

export function ScheduledExpenseContainer({ open, onClose }: ScheduledExpenseContainerProps) {
  const [scheduledExpenses, setScheduledExpenses] = React.useState<ScheduledExpense[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [formOpen, setFormOpen] = React.useState(false);
  const [scheduledExpenseToEdit, setScheduledExpenseToEdit] = React.useState<
    ScheduledExpense | undefined
  >();

  const scheduledExpenseService = React.useMemo(() => new ScheduledExpenseService(), []);

  const loadScheduledExpenses = React.useCallback(async () => {
    try {
      setLoading(true);
      const allScheduledExpenses = await scheduledExpenseService.getAllScheduledExpenses();
      setScheduledExpenses(allScheduledExpenses);
    } catch (error) {
      console.error('Failed to load scheduled expenses:', error);
    } finally {
      setLoading(false);
    }
  }, [scheduledExpenseService]);

  React.useEffect(() => {
    if (open) {
      loadScheduledExpenses();
    }
  }, [open, loadScheduledExpenses]);

  const handleAdd = () => {
    setScheduledExpenseToEdit(undefined);
    setFormOpen(true);
  };

  const handleEdit = (scheduledExpense: ScheduledExpense) => {
    setScheduledExpenseToEdit(scheduledExpense);
    setFormOpen(true);
  };

  const handleDelete = async (scheduledExpense: ScheduledExpense) => {
    if (!scheduledExpense.id) return;

    try {
      await scheduledExpenseService.deleteScheduledExpense(scheduledExpense.id);
      await loadScheduledExpenses();
    } catch (error) {
      console.error('Failed to delete scheduled expense:', error);
    }
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setScheduledExpenseToEdit(undefined);
  };

  const handleFormSave = async (scheduledExpense: ScheduledExpense) => {
    try {
      await scheduledExpenseService.saveScheduledExpense(scheduledExpense);
      setFormOpen(false);
      setScheduledExpenseToEdit(undefined);
      await loadScheduledExpenses();
    } catch (error) {
      console.error('Failed to save scheduled expense:', error);
    }
  };

  return (
    <>
      <ScheduledExpenseListDialog
        open={open}
        onClose={onClose}
        scheduledExpenses={scheduledExpenses}
        onAdd={handleAdd}
        onEdit={handleEdit}
        onDelete={handleDelete}
        loading={loading}
      />

      <ScheduledExpenseFormDialog
        open={formOpen}
        onClose={handleFormClose}
        onSave={handleFormSave}
        scheduledExpenseToEdit={scheduledExpenseToEdit}
      />
    </>
  );
}
