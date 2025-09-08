import React, { useCallback, useEffect } from 'react';
import { ILoan } from '../../../../domain/entities/loans/Loan';
import { Payment } from '../../../../domain/entities/loans/Payment';
import { LoanService } from '../../../../domain/services/LoanService';
import { Logger } from '../../../../domain/utils/Logger';
import { PaymentListDialog } from '../../../components/dialogs/PaymentListDialog';

export interface PaymentListContainerProps {
  open: boolean;
  loan: ILoan;
  onClose: () => void;
}

export function PaymentListContainer({ open, loan, onClose }: PaymentListContainerProps) {
  const loanService = React.useMemo(() => new LoanService(), []);
  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [showAddTransaction, setShowAddTransaction] = React.useState<boolean>(false);

  const loadPayments = useCallback(async () => {
    try {
      const payments = await loanService.getPaymentsByLoan(loan.id!);
      setPayments(payments);
    } catch (error) {
      Logger.error('Failed to load payments:', error);
    }
  }, [loanService, loan.id]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  const refresh = useCallback(() => {
    loadPayments();
  }, [loadPayments]);

  const deletePayment = useCallback(
    async (id: number) => {
      try {
        await loanService.deletePayment(id);
        await loadPayments();
      } catch (error) {
        Logger.error('Failed to delete payment:', error);
      }
    },
    [loanService, loadPayments]
  );

  return (
    <PaymentListDialog
      open={open}
      loan={loan}
      payments={payments}
      showAddTransaction={showAddTransaction}
      setShowAddTransaction={setShowAddTransaction}
      deletePayment={deletePayment}
      onClose={onClose}
      refresh={refresh}
    />
  );
}
