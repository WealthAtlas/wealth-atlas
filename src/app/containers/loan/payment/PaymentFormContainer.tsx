import { Logger } from '@/domain/utils/Logger';
import React, { useEffect, useMemo, useState } from 'react';
import { ILoan } from '../../../../domain/entities/loans/Loan';
import { IPayment, Payment } from '../../../../domain/entities/loans/Payment';
import { LoanService } from '../../../../domain/services/LoanService';
import { PaymentFormDialog } from '../../../components/dialogs/PaymentFormDialog';

export interface PaymentFormContainerProps {
  open: boolean;
  loan: ILoan;
  paymentToEdit?: Payment | undefined;
  onClose: () => void;
}

export function PaymentFormContainer({
  open,
  loan,
  paymentToEdit,
  onClose,
}: PaymentFormContainerProps) {
  const initialPayment: IPayment = React.useMemo(
    () => ({
      id: paymentToEdit?.id || undefined,
      loanId: paymentToEdit?.loanId || loan?.id || 0,
      description: paymentToEdit?.description || '',
      amount: paymentToEdit?.amount || 0,
      date: paymentToEdit?.date || new Date(),
    }),
    [paymentToEdit, loan]
  );

  const [payment, setPayment] = useState<IPayment>(initialPayment);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const loanService = useMemo(() => new LoanService(), []);

  useEffect(() => {
    if (open) {
      setPayment(initialPayment);
    }
  }, [open, initialPayment]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const paymentEntity = new Payment({
        id: payment.id,
        loanId: payment.loanId!,
        description: payment.description,
        amount: payment.amount,
        date: payment.date,
      });

      if (paymentToEdit) {
        await loanService.updatePayment(paymentEntity);
      } else {
        await loanService.createPayment(paymentEntity);
      }
    } catch (error) {
      Logger.error('Failed to save transaction:', error);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const title = paymentToEdit ? 'Edit Transaction' : 'Add New Transaction';

  return (
    <PaymentFormDialog
      open={open}
      title={title}
      payment={payment}
      isSubmitting={isSubmitting}
      loan={loan}
      onClose={onClose}
      onSubmit={handleSubmit}
      onPaymentChange={setPayment}
    />
  );
}
