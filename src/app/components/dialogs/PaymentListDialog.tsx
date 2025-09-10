import { Add, Close, Payment as PaymentIcon, TrendingDown } from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Stack,
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
import { UIUtils } from '../../utils/UIUtils';

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
  // Calculate payment statistics
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const paymentCount = payments.length;
  const averagePayment = paymentCount > 0 ? totalPayments / paymentCount : 0;

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
        <DialogTitle sx={{ pb: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1} alignItems="center">
              <PaymentIcon color="primary" />
              <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                Payment History
              </Typography>
              <Chip label={loan.name} variant="outlined" color="primary" size="small" />
            </Stack>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setShowAddTransaction(true)}
                size="medium"
                sx={{ borderRadius: 2 }}
              >
                Add Payment
              </Button>
              <IconButton onClick={onClose} size="small">
                <Close />
              </IconButton>
            </Box>
          </Box>
        </DialogTitle>

        <Divider />

        <DialogContent sx={{ pt: 2 }}>
          {payments.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 6, backgroundColor: 'grey.50' }}>
              <CardContent>
                <Box sx={{ mb: 3 }}>
                  <PaymentIcon sx={{ fontSize: 64, color: 'grey.400', mb: 2 }} />
                </Box>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                  No payments recorded
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ mb: 3, maxWidth: 400, mx: 'auto' }}
                >
                  Start tracking your loan payments to monitor your repayment progress and build a
                  comprehensive payment history.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => setShowAddTransaction(true)}
                  size="large"
                  sx={{ borderRadius: 2, px: 4 }}
                >
                  Record First Payment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Stack spacing={3}>
              {/* Payment Summary Cards */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: 2,
                }}
              >
                <Card
                  sx={{
                    backgroundColor: 'primary.50',
                    border: '1px solid',
                    borderColor: 'primary.200',
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography
                      variant="caption"
                      color="primary.main"
                      sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                    >
                      Total Paid
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 'bold', color: 'primary.main', mt: 1 }}
                    >
                      {UIUtils.formatCurrency(totalPayments, loan.currency)}
                    </Typography>
                  </CardContent>
                </Card>

                <Card
                  sx={{
                    backgroundColor: 'success.50',
                    border: '1px solid',
                    borderColor: 'success.200',
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography
                      variant="caption"
                      color="success.main"
                      sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                    >
                      Payments Made
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 'bold', color: 'success.main', mt: 1 }}
                    >
                      {paymentCount}
                    </Typography>
                  </CardContent>
                </Card>

                <Card
                  sx={{ backgroundColor: 'info.50', border: '1px solid', borderColor: 'info.200' }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography
                      variant="caption"
                      color="info.main"
                      sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                    >
                      Average Payment
                    </Typography>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'info.main', mt: 1 }}>
                      {UIUtils.formatCurrency(averagePayment, loan.currency)}
                    </Typography>
                  </CardContent>
                </Card>

                <Card
                  sx={{
                    backgroundColor: 'warning.50',
                    border: '1px solid',
                    borderColor: 'warning.200',
                  }}
                >
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography
                      variant="caption"
                      color="warning.main"
                      sx={{ fontWeight: 'bold', textTransform: 'uppercase' }}
                    >
                      Outstanding
                    </Typography>
                    <Typography
                      variant="h4"
                      sx={{ fontWeight: 'bold', color: 'warning.main', mt: 1 }}
                    >
                      {UIUtils.formatCurrency(
                        Math.max(0, loan.principalAmount - totalPayments),
                        loan.currency
                      )}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>

              {/* Payment Progress */}
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Repayment Progress
                    </Typography>
                    <Chip
                      icon={<TrendingDown />}
                      label={`${Math.min(100, (totalPayments / loan.principalAmount) * 100).toFixed(1)}% Paid`}
                      color="success"
                      variant="outlined"
                    />
                  </Box>
                  <Box
                    sx={{
                      width: '100%',
                      height: 8,
                      backgroundColor: 'grey.200',
                      borderRadius: 4,
                      overflow: 'hidden',
                    }}
                  >
                    <Box
                      sx={{
                        width: `${Math.min(100, (totalPayments / loan.principalAmount) * 100)}%`,
                        height: '100%',
                        backgroundColor: 'success.main',
                        transition: 'width 0.3s ease-in-out',
                      }}
                    />
                  </Box>
                </CardContent>
              </Card>

              {/* Payments Table */}
              <Card>
                <CardContent>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mb: 2,
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                      Payment Transactions
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {paymentCount} transaction{paymentCount !== 1 ? 's' : ''}
                    </Typography>
                  </Box>

                  <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={{ backgroundColor: 'grey.100' }}>
                          <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Date</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', py: 2 }}>Description</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 'bold', py: 2 }}>
                            Amount
                          </TableCell>
                          <TableCell align="center" sx={{ fontWeight: 'bold', py: 2 }}>
                            Actions
                          </TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {payments
                          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                          .map(payment => (
                            <PaymentViewContainer
                              key={payment.id!}
                              loan={loan}
                              paymentId={payment.id!}
                              deletePayment={deletePayment}
                            />
                          ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </CardContent>
              </Card>
            </Stack>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
