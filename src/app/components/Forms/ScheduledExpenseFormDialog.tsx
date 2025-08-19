import {
  EXPENSE_CATEGORY_LABELS,
  ExpenseCategory,
} from '@/domain/entities/expenses/ExpenseCategory';
import { ScheduledExpense } from '@/domain/entities/expenses/ScheduledExpense';
import { PaymentFrequency } from '@/domain/entities/loans/PaymentFrequency';
import { Currency } from '@/domain/entities/shared/Currency';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
} from '@mui/material';
import React from 'react';

interface ScheduledExpenseFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (scheduledExpense: ScheduledExpense) => void;
  scheduledExpenseToEdit?: ScheduledExpense;
}

export function ScheduledExpenseFormDialog({
  open,
  onClose,
  onSave,
  scheduledExpenseToEdit,
}: ScheduledExpenseFormDialogProps) {
  const [formData, setFormData] = React.useState({
    name: '',
    amount: '',
    currency: Currency.USD,
    category: ExpenseCategory.OTHER,
    isEssential: true,
    frequency: PaymentFrequency.MONTHLY,
    startDate: '',
    endDate: '',
    description: '',
  });

  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // Initialize form data when editing
  React.useEffect(() => {
    if (scheduledExpenseToEdit) {
      setFormData({
        name: scheduledExpenseToEdit.name,
        amount: scheduledExpenseToEdit.amount.toString(),
        currency: scheduledExpenseToEdit.currency as Currency,
        category: scheduledExpenseToEdit.category,
        isEssential: scheduledExpenseToEdit.isEssential,
        frequency: scheduledExpenseToEdit.frequency,
        startDate: scheduledExpenseToEdit.startDate.toISOString().split('T')[0],
        endDate: scheduledExpenseToEdit.endDate?.toISOString().split('T')[0] || '',
        description: scheduledExpenseToEdit.description || '',
      });
    } else {
      // Reset form for new scheduled expense
      const today = new Date().toISOString().split('T')[0];
      setFormData({
        name: '',
        amount: '',
        currency: Currency.USD,
        category: ExpenseCategory.OTHER,
        isEssential: true,
        frequency: PaymentFrequency.MONTHLY,
        startDate: today,
        endDate: '',
        description: '',
      });
    }
    setErrors({});
  }, [scheduledExpenseToEdit, open]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    const amount = parseFloat(formData.amount);
    if (!formData.amount || isNaN(amount) || amount <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (formData.endDate && formData.startDate) {
      const startDate = new Date(formData.startDate);
      const endDate = new Date(formData.endDate);
      if (endDate <= startDate) {
        newErrors.endDate = 'End date must be after start date';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const scheduledExpense = new ScheduledExpense(
      scheduledExpenseToEdit?.id,
      formData.name.trim(),
      parseFloat(formData.amount),
      formData.currency,
      formData.category,
      formData.isEssential,
      formData.frequency,
      new Date(formData.startDate),
      formData.endDate ? new Date(formData.endDate) : undefined,
      scheduledExpenseToEdit?.lastGeneratedDate,
      formData.description.trim() || undefined
    );

    onSave(scheduledExpense);
  };

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const title = scheduledExpenseToEdit ? 'Edit Scheduled Expense' : 'Add Scheduled Expense';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{title}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Name"
            fullWidth
            variant="outlined"
            value={formData.name}
            onChange={handleChange('name')}
            error={!!errors.name}
            helperText={errors.name || 'e.g., Monthly Rent, Netflix Subscription'}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Amount"
            type="number"
            fullWidth
            variant="outlined"
            value={formData.amount}
            onChange={handleChange('amount')}
            error={!!errors.amount}
            helperText={errors.amount}
            inputProps={{ min: 0, step: 0.01 }}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>Currency</InputLabel>
            <Select
              value={formData.currency}
              label="Currency"
              onChange={e =>
                setFormData(prev => ({ ...prev, currency: e.target.value as Currency }))
              }
            >
              {Object.values(Currency).map(currency => (
                <MenuItem key={currency} value={currency}>
                  {currency}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              label="Category"
              onChange={e =>
                setFormData(prev => ({ ...prev, category: e.target.value as ExpenseCategory }))
              }
            >
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>Frequency</InputLabel>
            <Select
              value={formData.frequency}
              label="Frequency"
              onChange={e =>
                setFormData(prev => ({ ...prev, frequency: e.target.value as PaymentFrequency }))
              }
            >
              {Object.values(PaymentFrequency).map(frequency => (
                <MenuItem key={frequency} value={frequency}>
                  {frequency}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControlLabel
            control={
              <Switch
                checked={formData.isEssential}
                onChange={handleChange('isEssential')}
                color="primary"
              />
            }
            label="Essential Expense"
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Start Date"
            type="date"
            fullWidth
            variant="outlined"
            value={formData.startDate}
            onChange={handleChange('startDate')}
            error={!!errors.startDate}
            helperText={errors.startDate}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="End Date (Optional)"
            type="date"
            fullWidth
            variant="outlined"
            value={formData.endDate}
            onChange={handleChange('endDate')}
            error={!!errors.endDate}
            helperText={errors.endDate || 'Leave empty for ongoing expense'}
            InputLabelProps={{ shrink: true }}
            sx={{ mb: 2 }}
          />

          <TextField
            margin="dense"
            label="Description (Optional)"
            fullWidth
            variant="outlined"
            multiline
            rows={2}
            value={formData.description}
            onChange={handleChange('description')}
            helperText="Additional details about this expense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained">
            {scheduledExpenseToEdit ? 'Update' : 'Add'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
