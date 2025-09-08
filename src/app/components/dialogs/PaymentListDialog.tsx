import { Add, Close } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { ILoan } from '../../../domain/entities/loans/Loan';
import { Payment } from '../../../domain/entities/loans/Payment';
import { PaymentFormContainer } from '../../containers/loan/payment/PaymentFormContainer';
import { PaymentViewContainer } from '../../containers/loan/payment/PaymentViewContainer';

export interface PaymentListDialogProps {
  open: boolean;
  loan: ILoan;
  payments: Payment[];
  showAddTransaction: boolean;
  setShowAddTransaction: (show: boolean) => void;
  deletePayment: (id: number) => void;
  refresh: () => void;
  onClose: () => void;
}

export function PaymentListDialog({
  open,
  loan,
  payments,
  showAddTransaction,
  setShowAddTransaction,
  deletePayment,
  refresh,
  onClose,
}: PaymentListDialogProps) {
  return (
    <>
      {showAddTransaction && (
        <PaymentFormContainer
          open={showAddTransaction}
          loan={loan}
          paymentToEdit={undefined}
          onClose={() => {
            setShowAddTransaction(false);
            refresh();
          }}
        />
      )}
      <Dialog open={open} onClose={onClose} maxWidth="xl" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Payments - {loan.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddTransaction(true)}
                size="small"
              >
                Add Payment
              </Button>
              <IconButton onClick={onClose} size="small">
                <Close />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent>
          {payments.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" gutterBottom>
                No payments found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Start tracking your investments by adding your first payment.
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddTransaction(true)}
              >
                Add First Payment
              </Button>
            </Box>
          ) : (
            <Box sx={{ space: 2 }}>
              <Typography variant="h6" gutterBottom>
                Recent Transactions
              </Typography>

              {/* Transactions Table */}
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow sx={{ backgroundColor: 'grey.50' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        Quantity
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        Unit Price
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                        Total Amount
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                        Actions
                      </TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {payments.map(transaction => (
                      <PaymentViewContainer
                        key={transaction.id!}
                        loan={loan}
                        paymentId={transaction.id!}
                        deletePayment={deletePayment}
                      />
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
