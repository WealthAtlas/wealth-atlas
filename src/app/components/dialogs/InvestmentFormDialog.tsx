import { Asset } from '@/domain/entities/assets/Asset';
import { IInvestment, InvestmentType } from '@/domain/entities/assets/Investment';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  TextField,
} from '@mui/material';
import { useState } from 'react';
import { UIUtils } from '../../utils/UIUtils';

export interface InvestmentFormDialogProps {
  open: boolean;
  title: string;
  asset: Asset;
  investment: IInvestment;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onTransactionChange: (transaction: IInvestment) => void;
}

export function InvestmentFormDialog({
  open,
  title,
  asset,
  investment,
  isSubmitting,
  onClose,
  onSubmit,
  onTransactionChange,
}: InvestmentFormDialogProps) {
  const [formattedAmount, setFormattedAmount] = useState<string>(
    investment.price ? UIUtils.formatNumberInput(investment.price.toString(), asset.currency) : ''
  );

  const handleAmountChange = (value: string) => {
    // Remove any existing formatting to get clean numeric input
    const cleanValue = value.replace(/[^\d.]/g, '');

    // Update the investment with the numeric value
    const numericValue = parseFloat(cleanValue) || 0;
    onTransactionChange({
      ...investment,
      price: numericValue,
    });

    // Format and display the value with proper locale formatting
    if (cleanValue && !isNaN(numericValue)) {
      const formatted = UIUtils.formatNumberInput(cleanValue, asset.currency);
      setFormattedAmount(formatted);
    } else {
      setFormattedAmount(cleanValue);
    }
  };

  const handleAmountBlur = () => {
    // Reformat the amount when field loses focus
    if (formattedAmount) {
      const formatted = UIUtils.formatNumberInput(formattedAmount, asset.currency);
      setFormattedAmount(formatted);
    }
  };

  const getCurrencySymbol = (currency: string): string => {
    const symbols: Record<string, string> = {
      USD: '$',
      INR: '₹',
      GBP: '£',
    };
    return symbols[currency] || currency;
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <FormControl component="fieldset" margin="normal" fullWidth>
          <FormLabel component="legend">Transaction Type</FormLabel>
          <RadioGroup
            row
            value={investment.type || InvestmentType.BUY}
            onChange={e =>
              onTransactionChange({
                ...investment,
                type: e.target.value as InvestmentType,
              })
            }
          >
            <FormControlLabel value={InvestmentType.BUY} control={<Radio />} label="Buy" />
            <FormControlLabel value={InvestmentType.SELL} control={<Radio />} label="Sell" />
          </RadioGroup>
        </FormControl>

        <TextField
          label="Quantity / Units"
          value={investment.quantity || ''}
          onChange={e =>
            onTransactionChange({
              ...investment,
              quantity: parseFloat(e.target.value) || undefined,
            })
          }
          type="number"
          inputProps={{ min: 0, step: 'any' }}
          helperText="Number of units/shares purchased"
          fullWidth
          margin="normal"
        />

        <TextField
          label="Total Amount"
          value={formattedAmount}
          onChange={e => handleAmountChange(e.target.value)}
          onBlur={handleAmountBlur}
          type="text"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">{getCurrencySymbol(asset.currency)}</InputAdornment>
            ),
          }}
          required
          fullWidth
          margin="normal"
          helperText="Total amount invested (including all fees and charges)"
        />

        <TextField
          label="Transaction Date"
          value={investment.date?.toISOString().split('T')[0] || ''}
          onChange={e =>
            onTransactionChange({
              ...investment,
              date: e.target.value ? new Date(e.target.value) : new Date(),
            })
          }
          type="date"
          InputLabelProps={{ shrink: true }}
          required
          fullWidth
          margin="normal"
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={isSubmitting} color="secondary">
          Cancel
        </Button>
        <Button onClick={onSubmit} disabled={isSubmitting} color="primary" variant="contained">
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
