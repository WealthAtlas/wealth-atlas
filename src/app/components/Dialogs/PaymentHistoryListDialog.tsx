import { Loan } from '@/domain/entities/loans/Loan';
import { LoanPayment } from '@/domain/entities/loans/LoanPayment';
import { Add, Delete, Edit, Payment } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  Grid,
  IconButton,
  Paper,
  Tooltip,
  Typography,
} from '@mui/material';

export interface PaymentHistoryListDialogProps {
  isOpen: boolean;
  loan: Loan;
  payments: LoanPayment[];
  isLoading: boolean;
  onAddPayment: () => void;
  onEditPayment: (payment: LoanPayment) => void;
  onDeletePayment: (paymentId: number) => void;
  onClose: () => void;
}

export function PaymentHistoryListDialog({
  isOpen,
  loan,
  payments,
  isLoading,
  onAddPayment,
  onEditPayment,
  onDeletePayment,
  onClose,
}: PaymentHistoryListDialogProps) {
  const formatCurrency = (amount: number): string => {
    // Use the loan's currency for formatting
    const currencySymbols: Record<string, string> = {
      USD: '$',
      INR: '₹',
      GBP: '£',
    };

    const symbol = currencySymbols[loan.currency] || loan.currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const formatDate = (date: Date): string => {
    return date.toLocaleDateString();
  };

  const getScheduleName = (payment: LoanPayment): string => {
    // Since LoanPayment doesn't have paymentScheduleId, we'll use description to indicate schedule
    if (payment.description?.includes('Schedule:')) {
      return payment.description.replace('Schedule:', '').trim();
    }
    return 'Manual Payment';
  };

  const getPaymentType = (payment: LoanPayment): 'scheduled' | 'manual' => {
    return payment.description?.includes('Schedule:') ? 'scheduled' : 'manual';
  };

  // Sort payments by date (newest first)
  const sortedPayments = [...payments].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const totalPaid = payments.reduce((sum, payment) => sum + payment.amount, 0);

  if (isLoading) {
    return (
      <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>Payment History for {loan.name}</DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: 200,
            }}
          >
            <CircularProgress />
          </Box>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Payment />
          Payment History for {loan.name}
        </Box>
      </DialogTitle>

      <DialogContent>
        {/* Summary Card */}
        <Card elevation={2} sx={{ mb: 3, bgcolor: 'primary.50' }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Total Payments
                </Typography>
                <Typography variant="h5">{payments.length}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Amount Paid
                </Typography>
                <Typography variant="h5">{formatCurrency(totalPaid)}</Typography>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Typography variant="body2" color="text.secondary">
                  Remaining Balance
                </Typography>
                <Typography variant="h5">
                  {formatCurrency(Math.max(0, loan.principalAmount - totalPaid))}
                </Typography>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Payment List */}
        <Grid container spacing={2}>
          {sortedPayments.map(payment => (
            <Grid item xs={12} key={payment.id}>
              <Card elevation={1}>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'start',
                    }}
                  >
                    <Box sx={{ flex: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography variant="h6" component="div">
                          {formatCurrency(payment.amount)}
                        </Typography>
                        <Chip
                          label={getPaymentType(payment) === 'scheduled' ? 'Scheduled' : 'Manual'}
                          color={getPaymentType(payment) === 'scheduled' ? 'primary' : 'default'}
                          size="small"
                        />
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {formatDate(payment.date)} • {getScheduleName(payment)}
                      </Typography>

                      {payment.description && (
                        <Typography variant="body2" color="text.secondary">
                          {payment.description}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Edit Payment">
                        <IconButton
                          size="small"
                          onClick={() => onEditPayment(payment)}
                          aria-label="edit payment"
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete Payment">
                        <IconButton
                          size="small"
                          onClick={() => payment.id && onDeletePayment(payment.id)}
                          aria-label="delete payment"
                          color="error"
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {payments.length === 0 && (
          <Paper elevation={0} sx={{ p: 4, textAlign: 'center', bgcolor: 'grey.50' }}>
            <Payment sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No payments recorded
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Start tracking your loan payments to monitor your progress.
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={onAddPayment}>
              Add First Payment
            </Button>
          </Paper>
        )}

        {/* Floating Action Button for adding payments */}
        {payments.length > 0 && (
          <Fab
            color="primary"
            aria-label="add payment"
            onClick={onAddPayment}
            sx={{
              position: 'absolute',
              bottom: 80,
              right: 24,
            }}
          >
            <Add />
          </Fab>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
