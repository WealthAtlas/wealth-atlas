import { validatePayment } from '@/domain/validation/EntityValidators';
import { isValid } from '@/domain/validation/ValidationIssue';
import { getCurrencySymbol } from '@/domain/entities/shared/Currency';
import {
  CalendarToday as CalendarIcon,
  AccountBalance as InvestmentIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { ILoan } from '../../../domain/entities/loans/Loan';
import { IPayment } from '../../../domain/entities/loans/Payment';
import { UIUtils } from '../../utils/UIUtils';

export interface PaymentFormDialogProps {
  open: boolean;
  title: string;
  loan: ILoan;
  payment: IPayment;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onPaymentChange: (transaction: IPayment) => void;
}

export function PaymentFormDialog({
  open,
  title,
  loan,
  payment,
  isSubmitting,
  onClose,
  onSubmit,
  onPaymentChange,
}: PaymentFormDialogProps) {
  const [formattedAmount, setFormattedAmount] = useState<string>('');

  // Sync formatted values with payment data
  useEffect(() => {
    if (payment.amount > 0) {
      setFormattedAmount(formatDisplayAmount(payment.amount));
    } else {
      setFormattedAmount('');
    }
  }, [payment.amount, payment.date]);

  // Format amount for display with proper decimal places
  const formatDisplayAmount = (value: number): string => {
    if (value === 0) return '';
    return value.toFixed(2).replace(/\.?0+$/, ''); // Remove trailing zeros
  };

  // Parse display amount to number
  const parseDisplayAmount = (value: string): number => {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100; // Round to 2 decimal places
  };

  const handleAmountChange = (value: string) => {
    // Allow only numbers and decimal point with up to 2 decimal places
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setFormattedAmount(value);
      const numericValue = parseDisplayAmount(value);
      onPaymentChange({
        ...payment,
        amount: numericValue,
      });
    }
  };

  const handleAmountBlur = () => {
    // Format on blur for consistent display
    if (formattedAmount && payment.amount > 0) {
      setFormattedAmount(formatDisplayAmount(payment.amount));
    }
  };

  const isFormValid = isValid(validatePayment(payment));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <InvestmentIcon color="primary" />
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          <Chip label={loan.name} color="primary" variant="outlined" size="small" />
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ pt: 2 }}>
          {/* Date and Amount Row */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Transaction Date"
              value={UIUtils.formatDateForInput(payment.date)}
              onChange={e =>
                onPaymentChange({
                  ...payment,
                  date: e.target.value ? new Date(e.target.value) : new Date(),
                })
              }
              type="date"
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarIcon color="action" />
                  </InputAdornment>
                ),
              }}
              required
              fullWidth
            />

            <Box flexGrow={1}>
              <TextField
                label="Total Amount"
                value={formattedAmount}
                onChange={e => handleAmountChange(e.target.value)}
                onBlur={handleAmountBlur}
                type="text"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Typography variant="body1" color="primary" fontWeight="bold">
                        {getCurrencySymbol(loan.currency)}
                      </Typography>
                    </InputAdornment>
                  ),
                }}
                inputProps={{
                  inputMode: 'decimal',
                  pattern: '[0-9]*\\.?[0-9]*',
                  style: { fontSize: '1.1rem', fontWeight: '500', textAlign: 'right' },
                }}
                required
                fullWidth
                helperText="Total amount invested (including fees)"
              />
              {formattedAmount && payment.amount > 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 1, mt: 0.5, display: 'block' }}
                >
                  Formatted: {getCurrencySymbol(loan.currency)}{' '}
                  {formatDisplayAmount(payment.amount)}
                </Typography>
              )}
            </Box>
          </Stack>

          {/* Validation Alert */}
          {!isFormValid && formattedAmount && (
            <Alert severity="warning" variant="outlined">
              Please ensure all required fields are filled correctly.
            </Alert>
          )}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1.5 }}>
        <Button onClick={onClose} disabled={isSubmitting} color="inherit" size="large">
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || !isFormValid}
          variant="contained"
          size="large"
          sx={{ minWidth: 140 }}
        >
          {isSubmitting ? 'Processing...' : 'Add Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
