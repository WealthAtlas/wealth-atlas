import { Logger } from '@/domain/utils/Logger';
import React, { useEffect, useMemo, useState } from 'react';
import { EMI, IEMI } from '../../../../domain/entities/loans/EMI';
import { ILoan } from '../../../../domain/entities/loans/Loan';
import { Frequency } from '../../../../domain/entities/shared/Frequency';
import { LoanService } from '../../../../domain/services/LoanService';
import { EMIFormDialog } from '../../../components/dialogs/EMIFormDialog';

export interface EMIFormContainerProps {
  open: boolean;
  loan: ILoan;
  emiToEdit?: EMI | undefined;
  onClose: () => void;
}

export function EMIFormContainer({ open, loan, emiToEdit, onClose }: EMIFormContainerProps) {
  const initialEMI: IEMI = React.useMemo(
    () => ({
      id: emiToEdit?.id || undefined,
      loanId: emiToEdit?.loanId || loan?.id || 0,
      amount: emiToEdit?.amount || 0,
      name: emiToEdit?.name || '',
      frequency: emiToEdit?.frequency || Frequency.MONTHLY,
      startDate: emiToEdit?.startDate || new Date(),
      endDate: emiToEdit?.endDate || new Date(),
    }),
    [emiToEdit, loan]
  );

  const [emi, setEMI] = useState<IEMI>(initialEMI);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const loanService = useMemo(() => new LoanService(), []);

  useEffect(() => {
    if (open) {
      setEMI(initialEMI);
    }
  }, [open, initialEMI]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);

      const emiEntity = new EMI({
        id: emi.id,
        loanId: emi.loanId!,
        name: emi.name,
        amount: emi.amount,
        frequency: emi.frequency,
        startDate: emi.startDate,
        endDate: emi.endDate,
      });

      if (emiToEdit) {
        await loanService.updatePaymentSchedule(emiEntity);
      } else {
        await loanService.createPaymentSchedule(emiEntity);
      }
    } catch (error) {
      Logger.error('Failed to save transaction:', error);
    } finally {
      setIsSubmitting(false);
      onClose();
    }
  };

  const title = emiToEdit ? 'Edit Transaction' : 'Add New Transaction';

  return (
    <EMIFormDialog
      open={open}
      title={title}
      emi={emi}
      isSubmitting={isSubmitting}
      loan={loan}
      onClose={onClose}
      onSubmit={handleSubmit}
      onEMIChange={setEMI}
    />
  );
}
