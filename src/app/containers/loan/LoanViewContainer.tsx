import { Loan } from '@/domain/entities/loans/Loan';
import { LoanService, LoanSummary } from '@/domain/services/LoanService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useState } from 'react';
import { LoanView } from '../../components/views/LoanView';

export interface LoanViewContainerProps {
  loanId: number;
  deleteLoan: (id: number) => void;
  refresh: () => void;
}

export function LoanViewContainer({ loanId, deleteLoan, refresh }: LoanViewContainerProps) {
  const [loan, setLoan] = useState<Loan | undefined>(undefined);
  const [loanSummary, setLoanSummary] = useState<LoanSummary | undefined>(undefined);
  const [showEditLoan, setShowEditLoan] = useState<boolean>(false);
  const loanService = React.useMemo(() => new LoanService(), []);

  const loadLoan = useCallback(async () => {
    try {
      const loadedLoan = await loanService.getLoan(loanId);
      const summaries = await loanService.getAllLoanSummaries();
      const summary = summaries.find(s => s.loan.id === loanId);

      setLoan(loadedLoan);
      setLoanSummary(summary);
    } catch (error) {
      Logger.error('Failed to load loan:', error);
    }
  }, [loanService, loanId]);

  useEffect(() => {
    loadLoan();
  }, [loadLoan]);

  return (
    <>
      {loan && loanSummary && (
        <LoanView
          loan={loan}
          loanSummary={loanSummary}
          refresh={() => {
            loadLoan();
            refresh();
          }}
          deleteLoan={deleteLoan}
          showEditLoan={showEditLoan}
          setShowEditLoan={setShowEditLoan}
        />
      )}
    </>
  );
}
