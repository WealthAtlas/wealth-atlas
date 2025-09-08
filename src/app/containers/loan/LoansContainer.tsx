import { LoansPage } from '@/app/components/pages/LoansPage';
import { Loan } from '@/domain/entities/loans/Loan';
import { LoanService, LoanSummary } from '@/domain/services/LoanService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useState } from 'react';

export function LoansContainer() {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loanSummaries, setLoanSummaries] = useState<LoanSummary[]>([]);
  const [showAddLoan, setShowAddLoan] = React.useState(false);
  const loanService = React.useMemo(() => new LoanService(), []);

  const loadLoans = useCallback(async () => {
    try {
      const loadedLoans = await loanService.getLoans();
      const summaries = await loanService.getAllLoanSummaries();
      setLoans(loadedLoans);
      setLoanSummaries(summaries);
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
    const totalOutstanding = loanSummaries.reduce(
      (sum, summary) => sum + summary.remainingBalance,
      0
    );
    const totalPaid = loanSummaries.reduce((sum, summary) => sum + summary.totalPaid, 0);
    const totalInterestPaid = loanSummaries.reduce(
      (sum, summary) => sum + summary.totalInterestPaid,
      0
    );
    const totalLoans = loans.length;

    return {
      totalOutstanding,
      totalPaid,
      totalInterestPaid,
      totalLoans,
    };
  }, [loans, loanSummaries]);

  useEffect(() => {
    loadLoans();
  }, [loadLoans]);

  return (
    <>
      <LoansPage
        loans={loans}
        loanSummaries={loanSummaries}
        portfolioMetrics={portfolioMetrics}
        showAddLoan={showAddLoan}
        refresh={loadLoans}
        deleteLoan={deleteLoan}
        setShowAddLoan={setShowAddLoan}
      />
    </>
  );
}
