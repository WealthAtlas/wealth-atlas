import { ExpenseCategory } from '@/domain/entities/expenses/ExpenseCategory';
import { Currency } from '@/domain/entities/shared/Currency';
import {
  Box,
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
  Typography,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { ChangeEvent } from 'react';
import { IExpense } from '../../../domain/entities/expenses/Expense';

interface ExpenseFormDialogProps {
  open: boolean;
  title: string;
  formData: IExpense;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onFormDataChange: (data: IExpense) => void;
}

export function ExpenseFormDialog({
  open,
  title,
  formData,
  isSubmitting,
  onClose,
  onSubmit,
  onFormDataChange,
}: ExpenseFormDialogProps) {
  const isFormValid =
    formData.amount && parseFloat(String(formData.amount)) > 0 && formData.currency;

  // Event handlers for cleaner JSX
  const handleInputChange = (field: keyof IExpense) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    if (field === 'amount') {
      // Handle amount with validation
      if (value === '' || /^\d*\.?\d*$/.test(value)) {
        onFormDataChange({
          ...formData,
          [field]: value === '' ? 0 : parseFloat(value) || 0,
        });
      }
    } else if (field === 'date') {
      onFormDataChange({
        ...formData,
        [field]: new Date(value),
      });
    } else {
      onFormDataChange({
        ...formData,
        [field]: value,
      });
    }
  };

  const handleSelectChange = (field: keyof IExpense) => (event: SelectChangeEvent) => {
    onFormDataChange({
      ...formData,
      [field]: event.target.value,
    });
  };

  const handleSwitchChange = (field: keyof IExpense) => (event: ChangeEvent<HTMLInputElement>) => {
    onFormDataChange({
      ...formData,
      [field]: event.target.checked,
    });
  };

  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return new Date().toISOString().split('T')[0];
    return date.toISOString().split('T')[0];
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Amount"
            type="text"
            value={formData.amount === 0 ? '' : String(formData.amount)}
            onChange={handleInputChange('amount')}
            required
            placeholder="Enter amount"
            autoFocus
            fullWidth
            inputProps={{
              inputMode: 'decimal',
              pattern: '[0-9]*\\.?[0-9]*',
            }}
          />

          <FormControl fullWidth>
            <InputLabel>Currency</InputLabel>
            <Select
              value={formData.currency || ''}
              onChange={handleSelectChange('currency')}
              label="Currency"
              required
            >
              {Object.entries(Currency).map(([key, value]) => (
                <MenuItem key={key} value={value}>
                  {key} - {String(value)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            name="expenseDate"
            label="Date"
            type="date"
            value={formatDateForInput(formData.date)}
            onChange={handleInputChange('date')}
            required
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category || ''}
              onChange={handleSelectChange('category')}
              label="Category"
            >
              {Object.entries(ExpenseCategory).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isEssential}
                  onChange={handleSwitchChange('isEssential')}
                />
              }
              label="Essential Expense"
            />
            <Typography variant="body2" color="text.secondary">
              {formData.isEssential ? 'Necessary expense' : 'Non-essential expense'}
            </Typography>
          </Box>

          <TextField
            label="Description (Optional)"
            value={formData.description || ''}
            onChange={handleInputChange('description')}
            multiline
            rows={2}
            placeholder="Add notes about this expense..."
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting} color="secondary">
          Cancel
        </Button>
        <Button
          onClick={onSubmit}
          disabled={isSubmitting || !isFormValid}
          variant="contained"
          color="primary"
        >
          {isSubmitting ? 'Submitting...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
