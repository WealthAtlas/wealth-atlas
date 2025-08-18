import { PaymentFrequency } from '@/domain/entities/PaymentFrequency';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';

export interface PaymentScheduleFormDialogProps {
  isOpen: boolean;
  isEditing: boolean;
  isSubmitting: boolean;
  error: string | null;
  loanName: string;
  initialValues: {
    name: string;
    amount: string;
    frequency: PaymentFrequency;
    startDate: string;
    endDate: string;
  };
  onSubmit: (formData: {
    name: string;
    amount: number;
    frequency: PaymentFrequency;
    startDate: Date;
    endDate: Date;
  }) => void;
  onClose: () => void;
}

export function PaymentScheduleFormDialog({
  isOpen,
  isEditing,
  isSubmitting,
  error,
  loanName,
  initialValues,
  onSubmit,
  onClose,
}: PaymentScheduleFormDialogProps) {
  const [formData, setFormData] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setFormData(initialValues);
      setErrors({});
    }
  }, [isOpen, initialValues]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Schedule name is required';
    }

    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be greater than zero';
    }

    if (!formData.frequency) {
      newErrors.frequency = 'Payment frequency is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (
      formData.startDate &&
      formData.endDate &&
      new Date(formData.startDate) >= new Date(formData.endDate)
    ) {
      newErrors.endDate = 'End date must be after start date';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    onSubmit({
      name: formData.name.trim(),
      amount: parseFloat(formData.amount),
      frequency: formData.frequency,
      startDate: new Date(formData.startDate),
      endDate: new Date(formData.endDate),
    });
  };

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value,
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const handleFrequencyChange = (event: SelectChangeEvent<PaymentFrequency>) => {
    setFormData(prev => ({
      ...prev,
      frequency: event.target.value as PaymentFrequency,
    }));

    if (errors.frequency) {
      setErrors(prev => ({
        ...prev,
        frequency: '',
      }));
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {isEditing ? 'Edit Payment Schedule' : 'Add Payment Schedule'}
          <br />
          <small>for {loanName}</small>
        </DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Schedule Name"
                value={formData.name}
                onChange={handleChange('name')}
                error={!!errors.name}
                helperText={errors.name}
                fullWidth
                required
                placeholder="e.g., Monthly EMI, Annual Bonus Payment"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Payment Amount"
                type="number"
                value={formData.amount}
                onChange={handleChange('amount')}
                error={!!errors.amount}
                helperText={errors.amount}
                fullWidth
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.frequency}>
                <InputLabel>Payment Frequency</InputLabel>
                <Select
                  value={formData.frequency}
                  label="Payment Frequency"
                  onChange={handleFrequencyChange}
                >
                  {Object.entries(PaymentFrequency).map(([key, value]) => (
                    <MenuItem key={key} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
                {errors.frequency && (
                  <small style={{ color: '#d32f2f', marginLeft: 14 }}>{errors.frequency}</small>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={handleChange('startDate')}
                error={!!errors.startDate}
                helperText={errors.startDate}
                fullWidth
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="End Date"
                type="date"
                value={formData.endDate}
                onChange={handleChange('endDate')}
                error={!!errors.endDate}
                helperText={errors.endDate}
                fullWidth
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Schedule' : 'Add Schedule'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
