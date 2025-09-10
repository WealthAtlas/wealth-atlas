import { Loan } from '@/domain/entities/loans/Loan';
import { LoanService } from '@/domain/services/LoanService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useState } from 'react';
import { LoanView } from '../../components/views/LoanView';
import { EMIListContainer } from './emi/EMIListContainer';
import { PaymentListContainer } from './payment/PaymentListContainer';

export interface LoanViewContainerProps {
  loanId: number;
  deleteLoan: (id: number) => void;
  refresh: () => void;
}

export function LoanViewContainer({ loanId, deleteLoan, refresh }: LoanViewContainerProps) {
  const [loan, setLoan] = useState<Loan | undefined>(undefined);
  const [showEditLoan, setShowEditLoan] = useState<boolean>(false);
  const [showEMIList, setShowEMIList] = useState<boolean>(false);
  const [showPaymentList, setShowPaymentList] = useState<boolean>(false);
  const loanService = React.useMemo(() => new LoanService(), []);

  const loadLoan = useCallback(async () => {
    try {
      const loadedLoan = await loanService.getLoan(loanId);
      setLoan(loadedLoan);
    } catch (error) {
      Logger.error('Failed to load loan:', error);
    }
  }, [loanService, loanId]);

  useEffect(() => {
    loadLoan();
  }, [loadLoan]);

  return (
    <>
      {loan && (
        <LoanView
          loan={loan}
          refresh={() => {
            loadLoan();
            refresh();
          }}
          deleteLoan={deleteLoan}
          showEditLoan={showEditLoan}
          setShowEditLoan={setShowEditLoan}
          showEMIList={showEMIList}
          setShowEMIList={setShowEMIList}
          showPaymentList={showPaymentList}
          setShowPaymentList={setShowPaymentList}
        />
      )}
      {loan && showEMIList && (
        <EMIListContainer
          open={showEMIList}
          loan={loan}
          onClose={() => {
            setShowEMIList(false);
            loadLoan();
            refresh();
          }}
        />
      )}
      {loan && showPaymentList && (
        <PaymentListContainer
          open={showPaymentList}
          loan={loan}
          onClose={() => {
            setShowPaymentList(false);
            loadLoan();
            refresh();
          }}
        />
      )}
    </>
  );
}
