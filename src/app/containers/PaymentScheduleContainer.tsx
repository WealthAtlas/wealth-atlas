import { PaymentScheduleListDialog } from '@/app/components/Dialogs/PaymentScheduleListDialog';
import { PaymentScheduleFormDialog } from '@/app/components/Forms/PaymentScheduleFormDialog';
import { LoanPaymentScheduleRepository } from '@/data/repositories/loan/LoanPaymentScheduleRepository';
import { Loan } from '@/domain/entities/loans/Loan';
import { PaymentFrequency } from '@/domain/entities/loans/PaymentFrequency';
import { PaymentSchedule } from '@/domain/entities/loans/PaymentSchedule';
import { Logger } from '@/domain/utils/Logger';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface PaymentScheduleContainerProps {
  isOpen: boolean;
  loan: Loan;
  scheduleToEdit: PaymentSchedule | null;
  onSave: () => void;
  onClose: () => void;
}

export function PaymentScheduleContainer({
  isOpen,
  loan,
  scheduleToEdit: _scheduleToEdit,
  onSave,
  onClose,
}: PaymentScheduleContainerProps) {
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [scheduleToEdit, setScheduleToEdit] = useState<PaymentSchedule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const paymentScheduleRepository = useMemo(() => new LoanPaymentScheduleRepository(), []);

  const loadSchedules = useCallback(async () => {
    try {
      setIsLoading(true);
      if (loan.id) {
        const loadedSchedules = await paymentScheduleRepository.findByLoanId(loan.id);
        setSchedules(loadedSchedules);
      }
    } catch (err) {
      Logger.error('Failed to load payment schedules:', err);
      setError('Failed to load payment schedules');
    } finally {
      setIsLoading(false);
    }
  }, [loan.id, paymentScheduleRepository]);

  useEffect(() => {
    if (isOpen && loan.id) {
      loadSchedules();
    }
  }, [isOpen, loan.id, loadSchedules]);

  const handleAddSchedule = () => {
    setScheduleToEdit(null);
    setIsFormOpen(true);
  };

  const handleEditSchedule = (schedule: PaymentSchedule) => {
    setScheduleToEdit(schedule);
    setIsFormOpen(true);
  };

  const handleDeleteSchedule = async (scheduleId: number) => {
    try {
      await paymentScheduleRepository.delete(scheduleId);
      await loadSchedules();
    } catch (err) {
      Logger.error('Failed to delete schedule:', err);
      setError('Failed to delete schedule');
    }
  };

  const handleFormSubmit = async (formData: {
    name: string;
    amount: number;
    frequency: PaymentFrequency;
    startDate: Date;
    endDate: Date;
  }) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!loan.id) {
        throw new Error('Loan ID is required');
      }

      const schedule = new PaymentSchedule(
        scheduleToEdit?.id,
        loan.id,
        formData.name,
        formData.amount,
        formData.frequency,
        formData.startDate,
        formData.endDate,
        scheduleToEdit?.lastGeneratedDate
      );

      await paymentScheduleRepository.save(schedule);
      setIsFormOpen(false);
      setScheduleToEdit(null);
      await loadSchedules();
      onSave(); // Trigger auto-conversion in parent
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save schedule');
      setIsSubmitting(false);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setScheduleToEdit(null);
    setError(null);
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const initialValues = scheduleToEdit
    ? {
        name: scheduleToEdit.name,
        amount: scheduleToEdit.amount.toString(),
        frequency: scheduleToEdit.frequency,
        startDate: scheduleToEdit.startDate.toISOString().split('T')[0],
        endDate: scheduleToEdit.endDate.toISOString().split('T')[0],
      }
    : {
        name: '',
        amount: '',
        frequency: PaymentFrequency.MONTHLY,
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 year from now
      };

  return (
    <>
      {/* Main Schedule List Dialog */}
      <PaymentScheduleListDialog
        isOpen={isOpen && !isFormOpen}
        loan={loan}
        schedules={schedules}
        isLoading={isLoading}
        onAddSchedule={handleAddSchedule}
        onEditSchedule={handleEditSchedule}
        onDeleteSchedule={handleDeleteSchedule}
        onClose={handleClose}
      />

      {/* Schedule Form Dialog */}
      {isFormOpen && (
        <PaymentScheduleFormDialog
          isOpen={isFormOpen}
          isEditing={!!scheduleToEdit}
          isSubmitting={isSubmitting}
          error={error}
          loanName={loan.name}
          initialValues={initialValues}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
        />
      )}
    </>
  );
}
