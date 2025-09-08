import { Delete, Edit } from '@mui/icons-material';
import { Box, IconButton, TableCell, TableRow, Tooltip } from '@mui/material';
import { ILoan } from '../../../domain/entities/loans/Loan';
import { Payment } from '../../../domain/entities/loans/Payment';
import { PaymentFormContainer } from '../../containers/loan/payment/PaymentFormContainer';
import { UIUtils } from '../../utils/UIUtils';

export interface PaymentViewProps {
  loan: ILoan;
  payment: Payment;
  showTransactionEdit: boolean;
  setShowTransactionEdit: (show: boolean) => void;
  deletePayment: (id: number) => void;
  refresh: () => void;
}

export function PaymentView({
  loan,
  payment,
  showTransactionEdit,
  setShowTransactionEdit,
  deletePayment,
  refresh,
}: PaymentViewProps) {
  return (
    <>
      {showTransactionEdit && (
        <PaymentFormContainer
          open={showTransactionEdit}
          loan={loan}
          paymentToEdit={payment}
          onClose={() => {
            setShowTransactionEdit(false);
            refresh();
          }}
        />
      )}
      <TableRow key={payment.id} sx={{ '&:hover': { backgroundColor: 'grey.50' } }}>
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
            <Box component="span" sx={{ fontWeight: 'medium' }}>
              {new Date(payment.date).toLocaleDateString()}
            </Box>
            <Box component="span" sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
              {new Date(payment.date).toLocaleDateString('en-US', {
                weekday: 'short',
              })}
            </Box>
          </Box>
        </TableCell>
        <TableCell align="right">
          <Box sx={{ fontWeight: 'medium' }}>
            {UIUtils.formatCurrency(payment.amount, loan.currency)}
          </Box>
        </TableCell>
        <TableCell align="center">
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
            <Tooltip title="Edit Transaction">
              <IconButton
                size="small"
                onClick={() => setShowTransactionEdit(true)}
                aria-label="edit transaction"
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Transaction">
              <IconButton
                size="small"
                onClick={() => deletePayment(payment.id!)}
                aria-label="delete payment"
                color="error"
              >
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </TableCell>
      </TableRow>
    </>
  );
}
