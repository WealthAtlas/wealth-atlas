import { LoanRepository } from '@/data/repositories/LoanRepository';
import { Loan } from '@/domain/entities/loans/Loan';
import { Currency } from '@/domain/entities/shared/Currency';
import { useState } from 'react';
import { LoanFormDialog } from '../components/Forms/LoanFormDialog';

export interface LoanFormContainerProps {
  isOpen: boolean;
  loanToEdit: Loan | null;
  onSave: () => void;
  onClose: () => void;
}

export function LoanFormContainer({ isOpen, loanToEdit, onSave, onClose }: LoanFormContainerProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loanRepository = new LoanRepository();

  const handleSubmit = async (formData: {
    name: string;
    lenderName: string;
    principalAmount: number;
    currency: string;
    startDate: Date;
    description?: string;
  }) => {
    try {
      setIsSubmitting(true);
      setError(null);

      const loan = new Loan(
        loanToEdit?.id,
        formData.name,
        formData.lenderName,
        formData.principalAmount,
        formData.currency,
        formData.startDate,
        formData.description
      );

      await loanRepository.save(loan);
      onSave();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save loan');
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setError(null);
    onClose();
  };

  const initialValues = loanToEdit
    ? {
        name: loanToEdit.name,
        lenderName: loanToEdit.lenderName,
        principalAmount: loanToEdit.principalAmount.toString(),
        currency: loanToEdit.currency,
        startDate: loanToEdit.startDate.toISOString().split('T')[0],
        description: loanToEdit.description || '',
      }
    : {
        name: '',
        lenderName: '',
        principalAmount: '',
        currency: Currency.USD,
        startDate: new Date().toISOString().split('T')[0],
        description: '',
      };

  return (
    <LoanFormDialog
      isOpen={isOpen}
      isEditing={!!loanToEdit}
      isSubmitting={isSubmitting}
      error={error}
      initialValues={initialValues}
      onSubmit={handleSubmit}
      onClose={handleClose}
    />
  );
}
