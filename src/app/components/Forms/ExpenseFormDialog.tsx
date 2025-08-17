import { EXPENSE_CATEGORY_LABELS, ExpenseCategory } from '@/domain/entities/ExpenseCategory';
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
  SelectChangeEvent,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import React from 'react';

export interface ExpenseFormData {
  amount: string;
  currency: string;
  date: string;
  category: ExpenseCategory;
  isEssential: boolean;
  description: string;
}

interface ExpenseFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ExpenseFormData) => void;
  initialData?: ExpenseFormData;
  title?: string;
}

export function ExpenseFormDialog({
  open,
  onClose,
  onSave,
  initialData,
  title = 'Add Expense',
}: ExpenseFormDialogProps) {
  const [formData, setFormData] = React.useState<ExpenseFormData>({
    amount: '',
    currency: 'USD',
    date: new Date().toISOString().split('T')[0],
    category: ExpenseCategory.OTHER,
    isEssential: false,
    description: '',
  });

  React.useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      setFormData({
        amount: '',
        currency: 'USD',
        date: new Date().toISOString().split('T')[0],
        category: ExpenseCategory.OTHER,
        isEssential: false,
        description: '',
      });
    }
  }, [initialData, open]);

  const handleInputChange =
    (field: keyof ExpenseFormData) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFormData(prev => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleSelectChange =
    (field: keyof ExpenseFormData) => (event: SelectChangeEvent<ExpenseCategory>) => {
      setFormData(prev => ({
        ...prev,
        [field]: event.target.value,
      }));
    };

  const handleSwitchChange =
    (field: keyof ExpenseFormData) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setFormData(prev => ({
        ...prev,
        [field]: event.target.checked,
      }));
    };

  const handleSave = () => {
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      return;
    }
    onSave(formData);
    onClose();
  };

  const isFormValid = formData.amount && parseFloat(formData.amount) > 0 && formData.currency;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={handleInputChange('amount')}
            required
            inputProps={{ min: 0, step: 0.01 }}
            fullWidth
          />

          <TextField
            label="Currency"
            value={formData.currency}
            onChange={handleInputChange('currency')}
            required
            placeholder="e.g., USD, EUR, INR"
            fullWidth
          />

          <TextField
            label="Date"
            type="date"
            value={formData.date}
            onChange={handleInputChange('date')}
            required
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              onChange={handleSelectChange('category')}
              label="Category"
            >
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([value, label]) => (
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
            value={formData.description}
            onChange={handleInputChange('description')}
            multiline
            rows={2}
            placeholder="Add notes about this expense..."
            fullWidth
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={!isFormValid}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
