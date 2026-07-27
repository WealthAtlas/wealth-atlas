import { LoanFormDialog } from '@/app/components/dialogs/LoanFormDialog';
import { Currency } from '@/domain/entities/shared/Currency';
import { ILoan, Loan } from '@/domain/entities/loans/Loan';
import { LoanService } from '@/domain/services/LoanService';
import { Logger } from '@/domain/utils/Logger';
import React, { useEffect, useState } from 'react';

export interface LoanFormContainerProps {
  open: boolean;
  loanToEdit: Loan | undefined;
  onClose: () => void;
}

export function LoanFormContainer({ open, loanToEdit, onClose }: LoanFormContainerProps) {
  const initialLoan: ILoan = React.useMemo(
    () => ({
      id: loanToEdit?.id,
      name: loanToEdit?.name || '',
      description: loanToEdit?.description || '',
      principalAmount: loanToEdit?.principalAmount || 0,
      currency: loanToEdit?.currency || Currency.INR,
      startDate: loanToEdit?.startDate || new Date(),
    }),
    [loanToEdit]
  );

  const [loan, setLoan] = useState<ILoan>(initialLoan);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const loanService = React.useMemo(() => new LoanService(), []);

  // Reset form data when loanToEdit changes or dialog opens
  useEffect(() => {
    if (open) {
      setLoan(initialLoan);
    }
  }, [open, initialLoan]);

  const title = loanToEdit ? 'Edit Loan' : 'Add New Loan';

  return (
    <LoanFormDialog
      open={open}
      title={title}
      loan={loan}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onSubmit={async () => {
        if (isSubmitting) return;

        try {
          setIsSubmitting(true);

          if (loanToEdit) {
            const updatedLoan = new Loan({
              ...loan,
              payments: loanToEdit.payments,
              emis: loanToEdit.emis,
            });
            await loanService.updateLoan(updatedLoan);
          } else {
            const newLoan = new Loan({
              ...loan,
              payments: [],
              emis: [],
            });
            await loanService.createLoan(newLoan);
          }
        } catch (error) {
          Logger.error('Failed to save loan:', error);
        } finally {
          setIsSubmitting(false);
          onClose();
        }
      }}
      onLoanChange={function (loan: ILoan): void {
        setLoan(loan);
      }}
    />
  );
}
