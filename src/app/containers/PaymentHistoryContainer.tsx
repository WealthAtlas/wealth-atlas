import { PaymentHistoryListDialog } from '@/app/components/Dialogs/PaymentHistoryListDialog';
import { LoanPaymentFormDialog } from '@/app/components/Forms/LoanPaymentFormDialog';
import { LoanPaymentRepository } from '@/data/repositories/loan/LoanPaymentRepository';
import { LoanPaymentScheduleRepository } from '@/data/repositories/loan/LoanPaymentScheduleRepository';
import { Loan } from '@/domain/entities/loans/Loan';
import { LoanPayment } from '@/domain/entities/loans/LoanPayment';
import { PaymentSchedule } from '@/domain/entities/loans/PaymentSchedule';
import { Logger } from '@/domain/utils/Logger';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface PaymentHistoryContainerProps {
  isOpen: boolean;
  loan: Loan;
  onClose: () => void;
  onPaymentUpdated: () => void;
}

export function PaymentHistoryContainer({
  isOpen,
  loan,
  onClose,
  onPaymentUpdated,
}: PaymentHistoryContainerProps) {
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [paymentToEdit, setPaymentToEdit] = useState<LoanPayment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loanPaymentRepository = useMemo(() => new LoanPaymentRepository(), []);
  const paymentScheduleRepository = useMemo(() => new LoanPaymentScheduleRepository(), []);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      if (loan.id) {
        const [loadedPayments, loadedSchedules] = await Promise.all([
          loanPaymentRepository.findByLoanId(loan.id),
          paymentScheduleRepository.findByLoanId(loan.id),
        ]);
        setPayments(loadedPayments);
        setSchedules(loadedSchedules);
      }
    } catch (err) {
      Logger.error('Failed to load payment data:', err);
      setError('Failed to load payment data');
    } finally {
      setIsLoading(false);
    }
  }, [loan.id, loanPaymentRepository, paymentScheduleRepository]);

  useEffect(() => {
    if (isOpen && loan.id) {
      loadData();
    }
  }, [isOpen, loan.id, loadData]);

  const handleAddPayment = () => {
    setPaymentToEdit(null);
    setIsFormOpen(true);
  };

  const handleEditPayment = (payment: LoanPayment) => {
    setPaymentToEdit(payment);
    setIsFormOpen(true);
  };

  const handleDeletePayment = async (paymentId: number) => {
    try {
      await loanPaymentRepository.delete(paymentId);
      await loadData();
      onPaymentUpdated();
    } catch (err) {
      Logger.error('Failed to delete payment:', err);
      setError('Failed to delete payment');
    }
  };

  const handleFormSubmit = async (formData: {
    amount: number;
    date: Date;
    paymentScheduleId: number | undefined;
    notes: string;
  }) => {
    try {
      setIsSubmitting(true);
      setError(null);

      if (!loan.id) {
        throw new Error('Loan ID is required');
      }

      // Create description based on schedule and notes
      let description = formData.notes;
      if (formData.paymentScheduleId) {
        const schedule = schedules.find(s => s.id === formData.paymentScheduleId);
        if (schedule) {
          description = `Schedule: ${schedule.name}${formData.notes ? ` | ${formData.notes}` : ''}`;
        }
      }

      const payment = new LoanPayment(
        paymentToEdit?.id,
        loan.id,
        formData.date,
        formData.amount,
        true, // Payment is considered paid when recorded
        description
      );

      await loanPaymentRepository.save(payment);
      await loadData();
      onPaymentUpdated();
      setIsFormOpen(false);
      setPaymentToEdit(null);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to save payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setPaymentToEdit(null);
    setError(null);
  };

  const getInitialFormValues = () => {
    const today = new Date().toISOString().split('T')[0];

    if (paymentToEdit) {
      // Extract schedule ID and notes from description
      let scheduleId: number | undefined;
      let notes = paymentToEdit.description || '';

      if (paymentToEdit.description?.startsWith('Schedule:')) {
        const parts = paymentToEdit.description.split(' | ');
        const scheduleName = parts[0].replace('Schedule:', '').trim();
        const schedule = schedules.find(s => s.name === scheduleName);
        scheduleId = schedule?.id;
        notes = parts[1] || '';
      }

      return {
        amount: paymentToEdit.amount.toString(),
        date: paymentToEdit.date.toISOString().split('T')[0],
        paymentScheduleId: scheduleId,
        notes: notes,
      };
    }

    return {
      amount: '',
      date: today,
      paymentScheduleId: undefined,
      notes: '',
    };
  };

  return (
    <>
      <PaymentHistoryListDialog
        isOpen={isOpen && !isFormOpen}
        loan={loan}
        payments={payments}
        isLoading={isLoading}
        onAddPayment={handleAddPayment}
        onEditPayment={handleEditPayment}
        onDeletePayment={handleDeletePayment}
        onClose={onClose}
      />

      {isFormOpen && (
        <LoanPaymentFormDialog
          isOpen={isFormOpen}
          isEditing={paymentToEdit !== null}
          isSubmitting={isSubmitting}
          error={error}
          loanName={loan.name}
          schedules={schedules}
          initialValues={getInitialFormValues()}
          onSubmit={handleFormSubmit}
          onClose={handleFormClose}
        />
      )}
    </>
  );
}
