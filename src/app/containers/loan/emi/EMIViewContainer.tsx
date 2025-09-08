import React, { useCallback, useEffect, useState } from 'react';
import { EMI } from '../../../../domain/entities/loans/EMI';
import { ILoan } from '../../../../domain/entities/loans/Loan';
import { LoanService } from '../../../../domain/services/LoanService';
import { Logger } from '../../../../domain/utils/Logger';
import { EMIView } from '../../../components/views/EMIView';

export interface EMIViewContainerProps {
  loan: ILoan;
  emiId: number;
  deleteEMI: (id: number) => void;
}

export function EMIViewContainer({ loan, emiId, deleteEMI }: EMIViewContainerProps) {
  const loanService = React.useMemo(() => new LoanService(), []);
  const [emi, setEMI] = React.useState<EMI | undefined>(undefined);
  const [showTransactionEdit, setShowTransactionEdit] = useState<boolean>(false);

  const loadEMI = useCallback(async () => {
    try {
      const emi = (await loanService.getPaymentSchedulesByLoan(loan.id!)).filter(
        pay => pay.id === emiId
      )[0];
      setEMI(emi);
    } catch (error) {
      Logger.error('Failed to load EMI:', error);
    }
  }, [loanService, loan.id, emiId]);

  useEffect(() => {
    loadEMI();
  }, [loadEMI]);

  const refresh = useCallback(() => {
    loadEMI();
  }, [loadEMI]);

  return (
    <>
      {emi && (
        <EMIView
          loan={loan}
          emi={emi}
          showTransactionEdit={showTransactionEdit}
          deleteEMI={deleteEMI}
          refresh={refresh}
          setShowTransactionEdit={setShowTransactionEdit}
        />
      )}
    </>
  );
}
