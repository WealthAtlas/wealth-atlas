import { PaymentSchedule } from '@/domain/entities/PaymentSchedule';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

export interface LoanPaymentFormDialogProps {
  isOpen: boolean;
  isEditing: boolean;
  isSubmitting: boolean;
  error: string | null;
  loanName: string;
  schedules: PaymentSchedule[];
  initialValues: {
    amount: string;
    date: string;
    paymentScheduleId: number | undefined;
    notes: string;
  };
  onSubmit: (formData: {
    amount: number;
    date: Date;
    paymentScheduleId: number | undefined;
    notes: string;
  }) => void;
  onClose: () => void;
}

export function LoanPaymentFormDialog({
  isOpen,
  isEditing,
  isSubmitting,
  error,
  loanName,
  schedules,
  initialValues,
  onSubmit,
  onClose,
}: LoanPaymentFormDialogProps) {
  const [formData, setFormData] = useState({
    amount: '',
    date: '',
    paymentScheduleId: undefined as number | undefined,
    notes: '',
  });

  const [errors, setErrors] = useState({
    amount: '',
    date: '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: initialValues.amount,
        date: initialValues.date,
        paymentScheduleId: initialValues.paymentScheduleId,
        notes: initialValues.notes,
      });
      setErrors({ amount: '', date: '' });
    }
  }, [isOpen, initialValues]);

  const validateForm = () => {
    const newErrors = { amount: '', date: '' };
    let isValid = true;

    // Amount validation
    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Please enter a valid amount greater than 0';
      isValid = false;
    }

    // Date validation
    if (!formData.date) {
      newErrors.date = 'Please select a payment date';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = () => {
    if (!validateForm()) return;

    onSubmit({
      amount: parseFloat(formData.amount),
      date: new Date(formData.date),
      paymentScheduleId: formData.paymentScheduleId,
      notes: formData.notes,
    });
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    // Allow empty string and valid decimal numbers
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormData(prev => ({ ...prev, amount: value }));
      if (errors.amount) {
        setErrors(prev => ({ ...prev, amount: '' }));
      }
    }
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, date: event.target.value }));
    if (errors.date) {
      setErrors(prev => ({ ...prev, date: '' }));
    }
  };

  const handleScheduleChange = (event: SelectChangeEvent<number>) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      paymentScheduleId: value === '' ? undefined : Number(value),
    }));
  };

  const handleNotesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, notes: event.target.value }));
  };

  const formatCurrency = (amount: number): string => {
    return `$${amount.toLocaleString()}`;
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEditing ? 'Edit Payment' : 'Add Payment'} - {loanName}
      </DialogTitle>

      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          {error && (
            <Typography color="error" variant="body2">
              {error}
            </Typography>
          )}

          <TextField
            label="Payment Amount"
            value={formData.amount}
            onChange={handleAmountChange}
            error={!!errors.amount}
            helperText={errors.amount}
            placeholder="0.00"
            inputProps={{
              inputMode: 'decimal',
              pattern: '[0-9]*[.]?[0-9]*',
            }}
            fullWidth
            required
          />

          <TextField
            label="Payment Date"
            type="date"
            value={formData.date}
            onChange={handleDateChange}
            error={!!errors.date}
            helperText={errors.date}
            InputLabelProps={{
              shrink: true,
            }}
            fullWidth
            required
          />

          <FormControl fullWidth>
            <InputLabel>Associated Schedule (Optional)</InputLabel>
            <Select
              value={formData.paymentScheduleId || ''}
              label="Associated Schedule (Optional)"
              onChange={handleScheduleChange}
            >
              <MenuItem value="">
                <em>No specific schedule</em>
              </MenuItem>
              {schedules.map(schedule => (
                <MenuItem key={schedule.id} value={schedule.id}>
                  {schedule.name} - {formatCurrency(schedule.amount)} per{' '}
                  {schedule.frequency.toLowerCase()}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            label="Notes (Optional)"
            value={formData.notes}
            onChange={handleNotesChange}
            multiline
            rows={3}
            placeholder="Add any notes about this payment..."
            fullWidth
          />
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={isSubmitting}>
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Payment' : 'Add Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
