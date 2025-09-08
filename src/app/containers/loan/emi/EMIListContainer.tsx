import React, { useCallback, useEffect } from 'react';
import { EMI } from '../../../../domain/entities/loans/EMI';
import { ILoan } from '../../../../domain/entities/loans/Loan';
import { LoanService } from '../../../../domain/services/LoanService';
import { Logger } from '../../../../domain/utils/Logger';
import { EMIListDialog } from '../../../components/dialogs/EMIListDialog';

export interface EMIListContainerProps {
  open: boolean;
  loan: ILoan;
  onClose: () => void;
}

export function EMIListContainer({ open, loan, onClose }: EMIListContainerProps) {
  const loanService = React.useMemo(() => new LoanService(), []);
  const [emis, setEMIs] = React.useState<EMI[]>([]);
  const [showAddTransaction, setShowAddTransaction] = React.useState<boolean>(false);

  const loadEMIs = useCallback(async () => {
    try {
      const emis = await loanService.getPaymentSchedulesByLoan(loan.id!);
      setEMIs(emis);
    } catch (error) {
      Logger.error('Failed to load EMIs:', error);
    }
  }, [loanService, loan.id]);

  useEffect(() => {
    loadEMIs();
  }, [loadEMIs]);

  const refresh = useCallback(() => {
    loadEMIs();
  }, [loadEMIs]);

  const deleteEMI = useCallback(
    async (id: number) => {
      try {
        await loanService.deletePaymentSchedule(id);
        await loadEMIs();
      } catch (error) {
        Logger.error('Failed to delete EMI:', error);
      }
    },
    [loanService, loadEMIs]
  );

  return (
    <EMIListDialog
      open={open}
      loan={loan}
      emis={emis}
      showAddTransaction={showAddTransaction}
      setShowAddTransaction={setShowAddTransaction}
      deleteEMI={deleteEMI}
      onClose={onClose}
      refresh={refresh}
    />
  );
}
