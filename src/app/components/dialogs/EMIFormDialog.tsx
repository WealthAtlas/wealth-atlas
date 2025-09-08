import { Schedule } from '@mui/icons-material';
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
import { IEMI } from '../../../domain/entities/loans/EMI';
import { ILoan } from '../../../domain/entities/loans/Loan';
import { Frequency } from '../../../domain/entities/shared/Frequency';

export interface EMIFormDialogProps {
  open: boolean;
  title: string;
  loan: ILoan;
  emi: IEMI;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onEMIChange: (emi: IEMI) => void;
}

export function EMIFormDialog({
  open,
  title,
  loan,
  emi,
  isSubmitting,
  onClose,
  onSubmit,
  onEMIChange,
}: EMIFormDialogProps) {
  const [formattedAmount, setFormattedAmount] = useState<string>('');

  // Sync formatted values with EMI data
  useEffect(() => {
    if (emi.amount > 0) {
      setFormattedAmount(formatDisplayAmount(emi.amount));
    } else {
      setFormattedAmount('');
    }
  }, [emi.amount]);

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
      onEMIChange({
        ...emi,
        amount: numericValue,
      });
    }
  };

  const handleAmountBlur = () => {
    // Format on blur for consistent display
    if (formattedAmount && emi.amount > 0) {
      setFormattedAmount(formatDisplayAmount(emi.amount));
    }
  };

  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
      USD: '$',
      INR: '₹',
      GBP: '£',
    };
    return symbols[currency] || currency;
  };

  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return new Date().toISOString().split('T')[0];
    return date.toISOString().split('T')[0];
  };

  const handleFrequencyChange = (value: string) => {
    onEMIChange({
      ...emi,
      frequency: value as Frequency,
    });
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onEMIChange({
      ...emi,
      [field]: value ? new Date(value) : undefined,
    });
  };

  const handleNameChange = (value: string) => {
    onEMIChange({
      ...emi,
      name: value,
    });
  };

  const isFormValid = emi.amount > 0 && emi.name.trim() !== '' && emi.startDate && emi.frequency;

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
          <Schedule color="primary" />
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          <Chip label={loan.name} color="primary" variant="outlined" size="small" />
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ pt: 2 }}>
          {/* EMI Name */}
          <TextField
            label="EMI Name"
            value={emi.name}
            onChange={e => handleNameChange(e.target.value)}
            placeholder="e.g., Home Loan EMI, Car Loan EMI"
            required
            fullWidth
            helperText="Descriptive name for this EMI schedule"
          />

          {/* Date Range */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Start Date"
              value={formatDateForInput(emi.startDate)}
              onChange={e => handleDateChange('startDate', e.target.value)}
              type="date"
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              helperText="When EMI payments begin"
            />

            <TextField
              label="End Date"
              value={formatDateForInput(emi.endDate)}
              onChange={e => handleDateChange('endDate', e.target.value)}
              type="date"
              InputLabelProps={{ shrink: true }}
              fullWidth
              helperText="Optional: When EMI payments end"
            />
          </Stack>

          {/* Frequency and Amount */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Payment Frequency"
              value={emi.frequency}
              onChange={e => handleFrequencyChange(e.target.value)}
              select
              SelectProps={{ native: true }}
              required
              fullWidth
              helperText="How often EMI payments occur"
            >
              <option value="">Select Frequency</option>
              {Object.values(Frequency).map(freq => (
                <option key={freq} value={freq}>
                  {freq.charAt(0) + freq.slice(1).toLowerCase().replace('_', ' ')}
                </option>
              ))}
            </TextField>

            <TextField
              label="EMI Amount"
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
              helperText="Amount to be paid per EMI"
            />
          </Stack>

          {/* Amount Display Helper */}
          {formattedAmount && emi.amount > 0 && (
            <Box sx={{ backgroundColor: 'grey.50', p: 2, borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                EMI Schedule Summary:
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {getCurrencySymbol(loan.currency)} {formatDisplayAmount(emi.amount)} per{' '}
                {emi.frequency.toLowerCase().replace('_', ' ')}
              </Typography>
              {emi.startDate && (
                <Typography variant="body2" color="text.secondary">
                  Starting from {emi.startDate.toLocaleDateString()}
                  {emi.endDate && ` until ${emi.endDate.toLocaleDateString()}`}
                </Typography>
              )}
            </Box>
          )}

          {/* Validation Alert */}
          {!isFormValid && (emi.name || formattedAmount || emi.frequency) && (
            <Alert severity="warning" variant="outlined">
              Please fill in all required fields: EMI name, start date, frequency, and amount.
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
          {isSubmitting ? 'Creating...' : 'Create EMI Schedule'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
