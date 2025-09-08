import React, { useCallback, useEffect, useState } from 'react';
import { ILoan } from '../../../../domain/entities/loans/Loan';
import { Payment } from '../../../../domain/entities/loans/Payment';
import { LoanService } from '../../../../domain/services/LoanService';
import { Logger } from '../../../../domain/utils/Logger';
import { PaymentView } from '../../../components/views/PaymentView';

export interface PaymentViewContainerProps {
  loan: ILoan;
  paymentId: number;
  deletePayment: (id: number) => void;
}

export function PaymentViewContainer({
  loan,
  paymentId,
  deletePayment,
}: PaymentViewContainerProps) {
  const loanService = React.useMemo(() => new LoanService(), []);
  const [payment, setPayment] = React.useState<Payment | undefined>(undefined);
  const [showTransactionEdit, setShowTransactionEdit] = useState<boolean>(false);

  const loadPayment = useCallback(async () => {
    try {
      const payment = (await loanService.getPaymentsByLoan(loan.id!)).filter(
        pay => pay.id === paymentId
      )[0];
      setPayment(payment);
    } catch (error) {
      Logger.error('Failed to load payment:', error);
    }
  }, [loanService, loan.id, paymentId]);

  useEffect(() => {
    loadPayment();
  }, [loadPayment]);

  const refresh = useCallback(() => {
    loadPayment();
  }, [loadPayment]);

  return (
    <>
      {payment && (
        <PaymentView
          loan={loan}
          payment={payment}
          showTransactionEdit={showTransactionEdit}
          deletePayment={deletePayment}
          refresh={refresh}
          setShowTransactionEdit={setShowTransactionEdit}
        />
      )}
    </>
  );
}
