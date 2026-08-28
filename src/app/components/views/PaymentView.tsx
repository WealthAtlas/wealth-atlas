import { CalendarToday, Delete, Edit, Payment as PaymentIcon } from '@mui/icons-material';
import {
  Box,
  Chip,
  IconButton,
  Stack,
  TableCell,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
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
  // Helper function to get relative time
  const getRelativeTimeInfo = (date: Date): string => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));

    if (diffInDays === 0) return 'Today';
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays <= 7) return `${diffInDays} days ago`;
    if (diffInDays <= 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    if (diffInDays <= 365) return `${Math.floor(diffInDays / 30)} months ago`;
    return `${Math.floor(diffInDays / 365)} years ago`;
  };

  // Helper function to categorize payment type based on description
  const getPaymentCategory = (
    description: string
  ): { label: string; color: 'primary' | 'info' | 'success' | 'warning' } => {
    const desc = description.toLowerCase();

    if (desc.includes('emi') || desc.includes('installment')) {
      return { label: 'EMI', color: 'primary' };
    }
    if (desc.includes('principal') || desc.includes('prepay')) {
      return { label: 'Principal', color: 'success' };
    }
    if (desc.includes('interest') || desc.includes('penalty')) {
      return { label: 'Interest', color: 'warning' };
    }
    if (desc.includes('fee') || desc.includes('charge')) {
      return { label: 'Fee', color: 'info' };
    }

    return { label: 'Payment', color: 'primary' };
  };

  // Helper function to format amount percentage of loan
  const getAmountContext = (amount: number, loanAmount: number): string => {
    const percentage = (amount / loanAmount) * 100;
    if (percentage < 1) return 'Small payment';
    if (percentage <= 5) return 'Regular payment';
    if (percentage <= 15) return 'Large payment';
    return 'Major payment';
  };

  const paymentDate = new Date(payment.date);
  const paymentCategory = getPaymentCategory(payment.description);
  const amountContext = getAmountContext(payment.amount, loan.principalAmount);

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
      <TableRow
        key={payment.id}
        sx={{
          '&:hover': { backgroundColor: 'grey.50' },
          borderLeft: `4px solid`,
          borderLeftColor: 'success.main',
        }}
      >
        {/* Date & Time Context */}
        <TableCell>
          <Stack spacing={0.5}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <CalendarToday fontSize="small" sx={{ color: 'text.secondary' }} />
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {paymentDate.toLocaleDateString(undefined, { timeZone: 'UTC' })}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              {paymentDate.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })} •{' '}
              {getRelativeTimeInfo(paymentDate)}
            </Typography>
          </Stack>
        </TableCell>

        {/* Payment Description & Category */}
        <TableCell>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <PaymentIcon fontSize="small" color="primary" />
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {payment.description || 'Loan Payment'}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Chip
                size="small"
                label={paymentCategory.label}
                color={paymentCategory.color}
                variant="outlined"
              />
              <Typography variant="caption" color="text.secondary">
                {amountContext}
              </Typography>
            </Box>
          </Box>
        </TableCell>

        {/* Payment Amount with Enhanced Display */}
        <TableCell align="right">
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 'bold',
                color: 'success.dark',
                fontSize: '1.125rem',
              }}
            >
              -{UIUtils.formatCurrency(payment.amount, loan.currency)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              payment made
            </Typography>
          </Box>
        </TableCell>

        {/* Actions with Better Accessibility */}
        <TableCell align="center">
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 0.5 }}>
            <Tooltip title="Edit Payment Transaction" arrow>
              <IconButton
                size="small"
                onClick={() => setShowTransactionEdit(true)}
                aria-label="edit payment transaction"
                color="primary"
                sx={{
                  '&:hover': {
                    backgroundColor: 'primary.light',
                    color: 'primary.dark',
                  },
                }}
              >
                <Edit fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete Payment Transaction" arrow>
              <IconButton
                size="small"
                onClick={() => deletePayment(payment.id!)}
                aria-label="delete payment transaction"
                color="error"
                sx={{
                  '&:hover': {
                    backgroundColor: 'error.light',
                    color: 'error.dark',
                  },
                }}
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
