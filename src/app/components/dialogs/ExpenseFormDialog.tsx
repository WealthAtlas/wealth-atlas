import { validateExpense } from '@/domain/validation/EntityValidators';
import { isValid } from '@/domain/validation/ValidationIssue';
import { ExpenseCategory } from '@/domain/entities/expenses/ExpenseCategory';
import { Currency, getCurrencySymbol } from '@/domain/entities/shared/Currency';
import {
  CalendarToday as CalendarIcon,
  Category as CategoryIcon,
  AttachMoney as MoneyIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Chip,
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
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { ChangeEvent, useEffect, useState } from 'react';
import { IExpense } from '../../../domain/entities/expenses/Expense';
import { utcDay } from '@/domain/utils/DateUtils';

interface ExpenseFormDialogProps {
  open: boolean;
  title: string;
  formData: IExpense;
  /** Codes the user has configured; the picker offers these. */
  currencies: Currency[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onFormDataChange: (data: IExpense) => void;
}

export function ExpenseFormDialog({
  open,
  title,
  currencies,
  formData,
  isSubmitting,
  onClose,
  onSubmit,
  onFormDataChange,
}: ExpenseFormDialogProps) {
  const [displayAmount, setDisplayAmount] = useState<string>('');

  // Sync display amount with form data
  useEffect(() => {
    if (formData.amount === 0) {
      setDisplayAmount('');
    } else {
      setDisplayAmount(formatDisplayAmount(formData.amount));
    }
  }, [formData.amount]);

  const isFormValid = isValid(validateExpense(formData));

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

  // Event handlers for cleaner JSX
  const handleAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setDisplayAmount(value);
      const numericValue = parseDisplayAmount(value);
      onFormDataChange({
        ...formData,
        amount: numericValue,
      });
    }
  };

  const handleAmountBlur = () => {
    // Format on blur for consistent display
    if (displayAmount && formData.amount > 0) {
      setDisplayAmount(formatDisplayAmount(formData.amount));
    }
  };

  const handleInputChange = (field: keyof IExpense) => (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;

    if (field === 'date') {
      onFormDataChange({
        ...formData,
        [field]: utcDay(new Date(value)),
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

  const getEssentialColor = (isEssential: boolean) => (isEssential ? 'success' : 'default');

  const getEssentialText = (isEssential: boolean) => (isEssential ? 'Essential' : 'Non-Essential');

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <MoneyIcon color="primary" />
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ pt: 2 }}>
          {/* Amount Input */}
          <Box>
            <TextField
              label="Amount"
              type="text"
              value={displayAmount}
              onChange={handleAmountChange}
              onBlur={handleAmountBlur}
              required
              placeholder="0.00"
              autoFocus
              fullWidth
              InputProps={{
                startAdornment: formData.currency ? (
                  <InputAdornment position="start">
                    <Typography variant="body1" color="primary" fontWeight="bold">
                      {getCurrencySymbol(formData.currency)}
                    </Typography>
                  </InputAdornment>
                ) : undefined,
              }}
              inputProps={{
                inputMode: 'decimal',
                pattern: '[0-9]*\\.?[0-9]*',
                style: { fontSize: '1.2rem', fontWeight: '500' },
              }}
              sx={{
                '& .MuiInputBase-input': {
                  textAlign: 'right',
                },
              }}
            />
            {displayAmount && formData.amount > 0 && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ ml: 1, mt: 0.5, display: 'block' }}
              >
                Formatted: {getCurrencySymbol(formData.currency || Currency.USD)}{' '}
                {formatDisplayAmount(formData.amount)}
              </Typography>
            )}
          </Box>

          {/* Currency and Date Row */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                value={formData.currency || ''}
                onChange={handleSelectChange('currency')}
                label="Currency"
                required
              >
                {currencies.map(code => (
                  <MenuItem key={code} value={code}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography fontWeight="bold">{getCurrencySymbol(code)}</Typography>
                      <Typography>{code}</Typography>
                    </Stack>
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
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarIcon color="action" />
                  </InputAdornment>
                ),
              }}
              fullWidth
            />
          </Stack>

          <Divider />

          {/* Category Selection */}
          <FormControl fullWidth>
            <InputLabel>Category</InputLabel>
            <Select
              value={formData.category || ''}
              onChange={handleSelectChange('category')}
              label="Category"
              startAdornment={
                <InputAdornment position="start">
                  <CategoryIcon color="action" />
                </InputAdornment>
              }
            >
              {Object.entries(ExpenseCategory).map(([value, label]) => (
                <MenuItem key={value} value={value}>
                  {label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Essential Toggle */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 1,
              border: '1px solid',
              borderColor: 'grey.200',
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Expense Priority
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formData.isEssential
                    ? 'This is a necessary expense (rent, utilities, groceries)'
                    : 'This is a discretionary expense (entertainment, dining out)'}
                </Typography>
              </Box>
              <Stack alignItems="center" spacing={1}>
                <Switch
                  checked={formData.isEssential}
                  onChange={handleSwitchChange('isEssential')}
                  color="success"
                />
                <Chip
                  label={getEssentialText(formData.isEssential)}
                  color={getEssentialColor(formData.isEssential)}
                  size="small"
                  variant="outlined"
                />
              </Stack>
            </Stack>
          </Box>

          {/* Description */}
          <TextField
            label="Description"
            value={formData.description || ''}
            onChange={handleInputChange('description')}
            multiline
            rows={3}
            placeholder="Add notes about this expense (optional)..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                  <NotesIcon color="action" />
                </InputAdornment>
              ),
            }}
            fullWidth
          />
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
          color="primary"
          size="large"
          sx={{ minWidth: 120 }}
        >
          {isSubmitting ? 'Saving...' : 'Save Expense'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
