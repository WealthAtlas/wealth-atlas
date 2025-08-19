import { Goal } from '@/domain/entities/goals/Goal';
import { Currency } from '@/domain/entities/shared/Currency';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';

interface GoalFormDialogProps {
  open: boolean;
  goalToEdit?: Goal;
  onClose: () => void;
  onSubmit: (goalData: GoalFormData) => void;
  isLoading?: boolean;
}

export interface GoalFormData {
  name: string;
  targetAmount: number;
  maturityDate: string; // ISO date string for form inputs
  inflationRate: number; // as percentage for display (6 for 6%)
  currency: string;
}

export const GoalFormDialog: React.FC<GoalFormDialogProps> = ({
  open,
  goalToEdit,
  onClose,
  onSubmit,
  isLoading = false,
}) => {
  const [formData, setFormData] = useState<GoalFormData>({
    name: '',
    targetAmount: 0,
    maturityDate: '',
    inflationRate: 6, // Default 6%
    currency: Currency.INR,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [inflationAdjustedTarget, setInflationAdjustedTarget] = useState<number | null>(null);

  const isEditMode = !!goalToEdit;

  // Initialize form data when goal changes
  useEffect(() => {
    if (goalToEdit) {
      setFormData({
        name: goalToEdit.name,
        targetAmount: goalToEdit.targetAmount,
        maturityDate: goalToEdit.maturityDate.toISOString().split('T')[0],
        inflationRate: goalToEdit.inflationRate * 100, // Convert to percentage
        currency: goalToEdit.currency,
      });
    } else {
      setFormData({
        name: '',
        targetAmount: 0,
        maturityDate: '',
        inflationRate: 6,
        currency: Currency.INR,
      });
    }
    setErrors({});
    setInflationAdjustedTarget(null);
  }, [goalToEdit, open]);

  // Calculate inflation-adjusted target when form data changes
  useEffect(() => {
    if (formData.targetAmount > 0 && formData.maturityDate && formData.inflationRate >= 0) {
      const maturityDate = new Date(formData.maturityDate);
      const currentDate = new Date();
      const years = Math.max(
        0,
        (maturityDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
      );

      if (years > 0) {
        const inflationRateDecimal = formData.inflationRate / 100;
        const adjustedTarget = formData.targetAmount * Math.pow(1 + inflationRateDecimal, years);
        setInflationAdjustedTarget(adjustedTarget);
      } else {
        setInflationAdjustedTarget(formData.targetAmount);
      }
    } else {
      setInflationAdjustedTarget(null);
    }
  }, [formData.targetAmount, formData.maturityDate, formData.inflationRate]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Goal name is required';
    }

    if (formData.targetAmount <= 0) {
      newErrors.targetAmount = 'Target amount must be greater than 0';
    }

    if (!formData.maturityDate) {
      newErrors.maturityDate = 'Maturity date is required';
    } else {
      const maturityDate = new Date(formData.maturityDate);
      const currentDate = new Date();
      if (maturityDate <= currentDate) {
        newErrors.maturityDate = 'Maturity date must be in the future';
      }
    }

    if (formData.inflationRate < 0 || formData.inflationRate > 100) {
      newErrors.inflationRate = 'Inflation rate must be between 0% and 100%';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
    }
  };

  const handleInputChange = (field: keyof GoalFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };

  const formatCurrency = (amount: number): string => {
    const currencySymbols: Record<string, string> = {
      [Currency.USD]: '$',
      [Currency.GBP]: '£',
      [Currency.INR]: '₹',
    };
    const symbol = currencySymbols[formData.currency] || formData.currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getMinDate = (): string => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{isEditMode ? `Edit Goal: ${goalToEdit?.name}` : 'Create New Goal'}</DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3} mt={1}>
          {/* Goal Name */}
          <TextField
            label="Goal Name"
            value={formData.name}
            onChange={e => handleInputChange('name', e.target.value)}
            error={!!errors.name}
            helperText={errors.name}
            placeholder="e.g., Children's College Fund, Dream Home, Retirement"
            fullWidth
          />

          {/* Target Amount and Currency */}
          <Box display="flex" gap={2}>
            <TextField
              label="Target Amount"
              type="number"
              value={formData.targetAmount || ''}
              onChange={e => handleInputChange('targetAmount', parseFloat(e.target.value) || 0)}
              error={!!errors.targetAmount}
              helperText={errors.targetAmount}
              inputProps={{ min: 0, step: 1000 }}
              sx={{ flex: 2 }}
            />
            <FormControl sx={{ flex: 1 }}>
              <InputLabel>Currency</InputLabel>
              <Select
                value={formData.currency}
                onChange={e => handleInputChange('currency', e.target.value)}
                label="Currency"
              >
                <MenuItem value={Currency.INR}>Indian Rupee (₹)</MenuItem>
                <MenuItem value={Currency.USD}>US Dollar ($)</MenuItem>
                <MenuItem value={Currency.GBP}>British Pound (£)</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Maturity Date */}
          <TextField
            label="Maturity Date"
            type="date"
            value={formData.maturityDate}
            onChange={e => handleInputChange('maturityDate', e.target.value)}
            error={!!errors.maturityDate}
            helperText={errors.maturityDate}
            InputLabelProps={{ shrink: true }}
            inputProps={{ min: getMinDate() }}
            fullWidth
          />

          {/* Inflation Rate */}
          <TextField
            label="Expected Inflation Rate"
            type="number"
            value={formData.inflationRate || ''}
            onChange={e => handleInputChange('inflationRate', parseFloat(e.target.value) || 0)}
            error={!!errors.inflationRate}
            helperText={
              errors.inflationRate || 'Annual inflation rate to adjust your target amount'
            }
            InputProps={{
              endAdornment: <InputAdornment position="end">%</InputAdornment>,
            }}
            inputProps={{ min: 0, max: 100, step: 0.1 }}
            fullWidth
          />

          {/* Inflation-Adjusted Target Preview */}
          {inflationAdjustedTarget !== null && (
            <>
              <Divider />
              <Box>
                <Typography variant="h6" gutterBottom>
                  Inflation-Adjusted Target
                </Typography>
                <Alert severity="info" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    Based on your expected inflation rate of {formData.inflationRate}% per year,
                    your target amount will need to be:
                  </Typography>
                </Alert>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1">Original Target:</Typography>
                  <Typography variant="h6">{formatCurrency(formData.targetAmount)}</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body1" color="warning.main">
                    Inflation-Adjusted Target:
                  </Typography>
                  <Typography variant="h6" color="warning.main">
                    {formatCurrency(inflationAdjustedTarget)}
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary" mt={1}>
                  This accounts for {formData.inflationRate}% annual inflation over{' '}
                  {formData.maturityDate
                    ? Math.max(
                        0,
                        (new Date(formData.maturityDate).getTime() - new Date().getTime()) /
                          (1000 * 60 * 60 * 24 * 365.25)
                      ).toFixed(1)
                    : '0'}{' '}
                  years.
                </Typography>
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSubmit} disabled={isLoading}>
          {isEditMode ? 'Update Goal' : 'Create Goal'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
