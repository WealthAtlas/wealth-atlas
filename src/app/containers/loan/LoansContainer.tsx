import { LoansPage } from '@/app/components/pages/LoansPage';
import { Loan } from '@/domain/entities/loans/Loan';
import { LoanService } from '@/domain/services/LoanService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useState } from 'react';

export function LoansContainer() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [showAddLoan, setShowAddLoan] = React.useState(false);
  const loanService = React.useMemo(() => new LoanService(), []);

  const loadLoans = useCallback(async () => {
    try {
      const loadedLoans = await loanService.getLoans();
      setLoans(loadedLoans);
    } catch (error) {
      Logger.error('Failed to load loans:', error);
    }
  }, [loanService]);

  const deleteLoan = useCallback(
    async (id: number) => {
      try {
        await loanService.deleteLoan(id);
        await loadLoans();
      } catch (error) {
        Logger.error('Failed to delete loan:', error);
      }
    },
    [loanService, loadLoans]
  );

  // Calculate portfolio-level metrics
  const portfolioMetrics = React.useMemo(() => {
    const totalOutstanding = loans.reduce((sum, loan) => sum + loan.getOutstandingAmount(), 0);
    const totalPaid = loans.reduce((sum, loan) => sum + loan.getPaidAmount(), 0);
    const totalInterestAmount = loans.reduce((sum, loan) => sum + loan.getInterestAmount(), 0);
    const totalLoans = loans.length;

    return {
      totalOutstanding,
      totalPaid,
      totalInterestAmount,
      totalLoans,
    };
  }, [loans]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  return (
    <>
      <LoansPage
        loans={loans}
        portfolioMetrics={portfolioMetrics}
        showAddLoan={showAddLoan}
        refresh={loadLoans}
        deleteLoan={deleteLoan}
        setShowAddLoan={setShowAddLoan}
      />
    </>
  );
}
