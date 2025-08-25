import { LoanPaymentRepository } from '@/data/repositories/loan/LoanPaymentRepository';
import { LoanPaymentScheduleRepository } from '@/data/repositories/loan/LoanPaymentScheduleRepository';
import { LoanRepository } from '@/data/repositories/loan/LoanRepository';
import { Loan } from '@/domain/entities/loans/Loan';
import { PaymentSchedule } from '@/domain/entities/loans/PaymentSchedule';
import { LoanService, LoanSummary } from '@/domain/services/LoanService';
import { Logger } from '@/domain/utils/Logger';
import { useEffect, useState } from 'react';
import { IRRAnalysisDialog } from '../components/Dialogs/IRRAnalysisDialog';
import { LoansPage } from '../components/Pages/LoansPage';
import { LoanFormContainer } from './LoanFormContainer';
import { PaymentHistoryContainer } from './PaymentHistoryContainer';
import { PaymentScheduleContainer } from './PaymentScheduleContainer';

export function LoansContainer() {
  const [loanSummaries, setLoanSummaries] = useState<LoanSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loanToEdit, setLoanToEdit] = useState<Loan | null>(null);
  const [isScheduleDialogOpen, setIsScheduleDialogOpen] = useState(false);
  const [loanForSchedule, setLoanForSchedule] = useState<Loan | null>(null);
  const [scheduleToEdit, setScheduleToEdit] = useState<PaymentSchedule | null>(null);
  const [isPaymentHistoryOpen, setIsPaymentHistoryOpen] = useState(false);
  const [loanForPaymentHistory, setLoanForPaymentHistory] = useState<Loan | null>(null);
  const [isIRRAnalysisOpen, setIsIRRAnalysisOpen] = useState(false);
  const [summaryForIRRAnalysis, setSummaryForIRRAnalysis] = useState<LoanSummary | null>(null);

  const loanRepository = new LoanRepository();
  const paymentScheduleRepository = new LoanPaymentScheduleRepository();
  const loanPaymentRepository = new LoanPaymentRepository();
  const loanService = new LoanService(
    loanRepository,
    paymentScheduleRepository,
    loanPaymentRepository
  );

  const loadLoans = async () => {
    try {
      setIsLoading(true);
      // Auto-convert scheduled payments first
      await loanService.autoConvertScheduledPayments();
      // Then load loan summaries with current data
      const summaries = await loanService.getAllLoanSummaries();
      setLoanSummaries(summaries);
    } catch (error) {
      // TODO: Add proper error handling with toast/snackbar
      Logger.error('Failed to load loans:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadLoans();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddLoan = () => {
    setLoanToEdit(null);
    setIsDialogOpen(true);
  };

  const handleEditLoan = (loan: Loan) => {
    setLoanToEdit(loan);
    setIsDialogOpen(true);
  };

  const handleDeleteLoan = async (loan: Loan) => {
    if (!loan.id) return;

    // Show confirmation dialog
    const confirmed = window.confirm(
      `Are you sure you want to delete "${loan.name}"?\n\nThis will also delete:\n• All payment schedules\n• All payment history\n• All related data\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      // Delete associated payment schedules first
      const schedules = await paymentScheduleRepository.findByLoanId(loan.id);
      for (const schedule of schedules) {
        if (schedule.id) {
          await paymentScheduleRepository.delete(schedule.id);
        }
      }

      // Delete associated payments
      const payments = await loanPaymentRepository.findByLoanId(loan.id);
      for (const payment of payments) {
        if (payment.id) {
          await loanPaymentRepository.delete(payment.id);
        }
      }

      // Finally delete the loan
      await loanRepository.delete(loan.id);

      // Reload the loan list
      await loadLoans();
    } catch (err) {
      Logger.error('Failed to delete loan:', err);
      alert('Failed to delete loan. Please try again.');
    }
  };

  const handleAddSchedule = (loan: Loan) => {
    setLoanForSchedule(loan);
    setScheduleToEdit(null);
    setIsScheduleDialogOpen(true);
  };

  const handleViewPaymentHistory = (loan: Loan) => {
    setLoanForPaymentHistory(loan);
    setIsPaymentHistoryOpen(true);
  };

  const handleLoanSaved = async () => {
    setIsDialogOpen(false);
    setLoanToEdit(null);
    await loadLoans();
  };

  const handleLoanDialogClose = () => {
    setIsDialogOpen(false);
    setLoanToEdit(null);
  };

  const handleScheduleSaved = async () => {
    setIsScheduleDialogOpen(false);
    setScheduleToEdit(null);
    setLoanForSchedule(null);
    await loadLoans(); // Reload to get updated summaries
  };

  const handleScheduleDialogClose = () => {
    setIsScheduleDialogOpen(false);
    setScheduleToEdit(null);
    setLoanForSchedule(null);
  };

  const handlePaymentHistoryClose = () => {
    setIsPaymentHistoryOpen(false);
    setLoanForPaymentHistory(null);
  };

  const handlePaymentUpdated = async () => {
    await loadLoans(); // Reload to get updated summaries
  };

  const handleViewIRRAnalysis = (summary: LoanSummary) => {
    setSummaryForIRRAnalysis(summary);
    setIsIRRAnalysisOpen(true);
  };

  const handleIRRAnalysisClose = () => {
    setIsIRRAnalysisOpen(false);
    setSummaryForIRRAnalysis(null);
  };

  return (
    <>
      <LoansPage
        loanSummaries={loanSummaries}
        isLoading={isLoading}
        onAddLoan={handleAddLoan}
        onEditLoan={handleEditLoan}
        onDeleteLoan={handleDeleteLoan}
        onAddSchedule={handleAddSchedule}
        onViewPaymentHistory={handleViewPaymentHistory}
        onViewIRRAnalysis={handleViewIRRAnalysis}
      />

      {/* Loan Form Dialog */}
      {isDialogOpen && (
        <LoanFormContainer
          isOpen={isDialogOpen}
          loanToEdit={loanToEdit}
          onSave={handleLoanSaved}
          onClose={handleLoanDialogClose}
        />
      )}

      {/* Payment Schedule Dialog */}
      {isScheduleDialogOpen && loanForSchedule && (
        <PaymentScheduleContainer
          isOpen={isScheduleDialogOpen}
          loan={loanForSchedule}
          scheduleToEdit={scheduleToEdit}
          onSave={handleScheduleSaved}
          onClose={handleScheduleDialogClose}
        />
      )}

      {/* Payment History Dialog */}
      {isPaymentHistoryOpen && loanForPaymentHistory && (
        <PaymentHistoryContainer
          isOpen={isPaymentHistoryOpen}
          loan={loanForPaymentHistory}
          onClose={handlePaymentHistoryClose}
          onPaymentUpdated={handlePaymentUpdated}
        />
      )}

      {/* IRR Analysis Dialog */}
      {isIRRAnalysisOpen && summaryForIRRAnalysis && (
        <IRRAnalysisDialog
          isOpen={isIRRAnalysisOpen}
          loanName={summaryForIRRAnalysis.loan.name}
          analysis={summaryForIRRAnalysis.irrAnalysis}
          onClose={handleIRRAnalysisClose}
        />
      )}
    </>
  );
}
