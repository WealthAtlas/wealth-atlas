import { Loan } from '@/domain/entities/loans/Loan';
import { LoanService, LoanSummary } from '@/domain/services/LoanService';
import { useEffect, useState } from 'react';
import { LoansPage } from '../components/Pages/LoansPage';

export function LoansContainer() {
  const [loanSummaries, setLoanSummaries] = useState<LoanSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loanService = new LoanService();

  const loadLoans = async () => {
    try {
      setIsLoading(true);
      const summaries = await loanService.getAllLoanSummaries();
      const formattedSummaries = summaries.map(summary => {
        const irr = summary.loan.getIRR();
        return {
          ...summary,
          formattedIRR: {
            primary: `${(irr * 100).toFixed(2)}%`,
            secondary: '',
            tooltip: `Internal Rate of Return (IRR): ${(irr * 100).toFixed(2)}%`,
          },
        };
      });
      setLoanSummaries(formattedSummaries);
    } catch (error) {
      console.error('Failed to load loans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
  }, []);

  const handleAddLoan = () => {
    console.log('Add Loan functionality to be implemented');
  };

  const handleEditLoan = (loan: Loan) => {
    console.log('Edit Loan functionality to be implemented', loan);
  };

  const handleDeleteLoan = async (loan: Loan) => {
    if (!loan.id) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${loan.name}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await loanService.deleteLoan(loan.id);
      await loadLoans();
    } catch (error) {
      console.error('Failed to delete loan:', error);
    }
  };

  const handleAddSchedule = (loan: Loan) => {
    console.log('Add Schedule functionality to be implemented', loan);
  };

  const handleViewPaymentHistory = (loan: Loan) => {
    console.log('View Payment History functionality to be implemented', loan);
  };

  return (
    <LoansPage
      loanSummaries={loanSummaries}
      isLoading={isLoading}
      onAddLoan={handleAddLoan}
      onEditLoan={handleEditLoan}
      onDeleteLoan={handleDeleteLoan}
      onAddSchedule={handleAddSchedule}
      onViewPaymentHistory={handleViewPaymentHistory}
    />
  );
}
