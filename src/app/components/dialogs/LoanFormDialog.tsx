import { validateLoan } from '@/domain/validation/EntityValidators';
import { isValid } from '@/domain/validation/ValidationIssue';
import { Currency, getCurrencySymbol } from '@/domain/entities/shared/Currency';
import { ILoan } from '@/domain/entities/loans/Loan';
import { Save } from '@mui/icons-material';
import {
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
import { UIUtils } from '../../utils/UIUtils';

export interface LoanFormDialogProps {
  open: boolean;
  title: string;
  loan: ILoan;
  /** Codes the user has configured; the picker offers these. */
  currencies: Currency[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onLoanChange: (loan: ILoan) => void;
}

export function LoanFormDialog({
  open,
  title,
  currencies,
  loan,
  isSubmitting,
  onClose,
  onSubmit,
  onLoanChange,
}: LoanFormDialogProps) {
  const isFormValid = isValid(validateLoan(loan));

  const handlePrincipalAmountChange = (value: string) => {
    const numericValue = UIUtils.parseFormattedNumber(value);
    onLoanChange({
      ...loan,
      principalAmount: numericValue,
    });
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <TextField
              label="Loan Name"
              value={loan.name}
              onChange={e => onLoanChange({ ...loan, name: e.target.value })}
              fullWidth
              required
              error={!loan.name}
              helperText={!loan.name ? 'Loan name is required' : ''}
            />
          </Grid>

          <Grid item xs={12}>
            <TextField
              label="Description"
              value={loan.description}
              onChange={e => onLoanChange({ ...loan, description: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Principal Amount"
              value={UIUtils.formatNumberInput(loan.principalAmount.toString(), loan.currency)}
              onChange={e => handlePrincipalAmountChange(e.target.value)}
              fullWidth
              required
              error={loan.principalAmount <= 0}
              helperText={
                loan.principalAmount <= 0 ? 'Principal amount must be greater than 0' : ''
              }
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Currency</InputLabel>
              <Select
                value={loan.currency}
                label="Currency"
                onChange={e => onLoanChange({ ...loan, currency: e.target.value as Currency })}
              >
                {currencies.map(code => (
                  <MenuItem key={code} value={code}>
                    {code} - {getCurrencySymbol(code)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              label="Start Date"
              type="date"
              value={UIUtils.formatDateForInput(loan.startDate)}
              onChange={e =>
                onLoanChange({
                  ...loan,
                  startDate: e.target.value ? new Date(e.target.value) : new Date(),
                })
              }
              fullWidth
              required
              error={!loan.startDate}
              helperText={!loan.startDate ? 'Start date is required' : ''}
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
        <Button
          onClick={onSubmit}
          variant="contained"
          startIcon={<Save />}
          disabled={isSubmitting || !isFormValid}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
