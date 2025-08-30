import { ExpenseCategory } from '@/domain/entities/expenses/ExpenseCategory';
import { Currency } from '@/domain/entities/shared/Currency'; // Fix missing import
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

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
          <TextField
            label="Amount"
            type="number"
            value={formData.amount}
            onChange={event =>
              onFormDataChange({
                ...formData,
                amount: parseFloat(event.target.value) || 0, // Ensure amount is a number
              })
            }
            required
            inputProps={{ min: 0, step: 0.01 }}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Currency</InputLabel>
            <Select
              value={formData.currency}
              onChange={event =>
                onFormDataChange({
                  ...formData,
                  currency: event.target.value,
                })
              }
              label="Currency"
              required
            >
              {Object.entries(Currency).map(([key, value]) => (
                <MenuItem key={key} value={key}>
                  {key} - {String(value)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            name="expenseDate"
            label="Date"
            type="date"
            value={formData.date?.toISOString().split('T')[0] || ''} // Ensure date is formatted correctly
            onChange={event =>
              onFormDataChange({
                ...formData,
                date: new Date(event.target.value), // Convert string to Date
              })
            }
            required
            InputLabelProps={{ shrink: true }}
            fullWidth
          />

          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category}
              onChange={event =>
                onFormDataChange({
                  ...formData,
                  category: event.target.value,
                })
              }
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
                  onChange={event =>
                    onFormDataChange({
                      ...formData,
                      isEssential: event.target.checked,
                    })
                  }
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
            onChange={event =>
              onFormDataChange({
                ...formData,
                description: event.target.value,
              })
            }
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
        <Button onClick={onSubmit} disabled={isSubmitting || !isFormValid} color="primary">
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
