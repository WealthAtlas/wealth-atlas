import { Currency } from '@/domain/entities/shared/Currency';
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
  TextField,
} from '@mui/material';
import { useEffect, useState } from 'react';

export interface LoanFormDialogProps {
  isOpen: boolean;
  isEditing: boolean;
  isSubmitting: boolean;
  error: string | null;
  initialValues: {
    name: string;
    lenderName: string;
    principalAmount: string;
    currency: string;
    startDate: string;
    description: string;
  };
  onSubmit: (formData: {
    name: string;
    lenderName: string;
    principalAmount: number;
    currency: string;
    startDate: Date;
    description?: string;
  }) => void;
  onClose: () => void;
}

export function LoanFormDialog({
  isOpen,
  isEditing,
  isSubmitting,
  error,
  initialValues,
  onSubmit,
  onClose,
}: LoanFormDialogProps) {
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
      newErrors.name = 'Loan name is required';
    }

    if (!formData.lenderName.trim()) {
      newErrors.lenderName = 'Lender name is required';
    }

    if (!formData.principalAmount || parseFloat(formData.principalAmount) <= 0) {
      newErrors.principalAmount = 'Principal amount must be greater than zero';
    }

    if (!formData.currency) {
      newErrors.currency = 'Currency is required';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
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
      lenderName: formData.lenderName.trim(),
      principalAmount: parseFloat(formData.principalAmount),
      currency: formData.currency,
      startDate: new Date(formData.startDate),
      description: formData.description.trim() || undefined,
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

  const handleNumberChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };
  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      startDate: event.target.value,
    }));

    if (errors.startDate) {
      setErrors(prev => ({
        ...prev,
        startDate: '',
      }));
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{isEditing ? 'Edit Loan' : 'Add New Loan'}</DialogTitle>

        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                label="Loan Name"
                value={formData.name}
                onChange={handleChange('name')}
                error={!!errors.name}
                helperText={errors.name}
                fullWidth
                required
                placeholder="e.g., Home Mortgage, Car Loan"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Lender Name"
                value={formData.lenderName}
                onChange={handleChange('lenderName')}
                error={!!errors.lenderName}
                helperText={errors.lenderName}
                fullWidth
                required
                placeholder="e.g., Bank of America, Chase"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                label="Principal Amount"
                type="number"
                value={formData.principalAmount}
                onChange={handleNumberChange('principalAmount')}
                error={!!errors.principalAmount}
                helperText={errors.principalAmount}
                fullWidth
                required
                inputProps={{ min: 0, step: 0.01 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.currency}>
                <InputLabel>Currency</InputLabel>
                <Select
                  value={formData.currency}
                  label="Currency"
                  onChange={e => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                >
                  {Object.entries(Currency).map(([key, value]) => (
                    <MenuItem key={key} value={key}>
                      {key} - {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Start Date"
                type="date"
                value={formData.startDate}
                onChange={handleDateChange}
                error={!!errors.startDate}
                helperText={errors.startDate}
                fullWidth
                required
                InputLabelProps={{
                  shrink: true,
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                label="Description"
                value={formData.description}
                onChange={handleChange('description')}
                fullWidth
                multiline
                rows={3}
                placeholder="Optional description or notes about this loan"
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : isEditing ? 'Update Loan' : 'Add Loan'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
