import { Asset } from '@/domain/entities/assets/Asset';
import { IInvestment } from '@/domain/entities/assets/Investment';
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
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <FormControl component="fieldset" margin="normal">
          <FormLabel component="legend">Transaction Type</FormLabel>
          <RadioGroup
            row
            value={investment.price > 0 ? 'buy' : 'sell'}
            onChange={e =>
              onTransactionChange({
                ...investment,
                quantity:
                  e.target.value == 'buy' ? investment.quantity || 1 : -(investment.quantity || -1),
                price: e.target.value == 'buy' ? investment.price || 0 : -(investment.price || -1),
              })
            }
          >
            <FormControlLabel value="buy" control={<Radio />} label="Buy" />
            <FormControlLabel value="sell" control={<Radio />} label="Sell" />
          </RadioGroup>
        </FormControl>

        <TextField
          label="Quantity"
          value={investment.quantity}
          onChange={e =>
            onTransactionChange({ ...investment, quantity: parseFloat(e.target.value) || 0 })
          }
          type="number"
          inputProps={{ min: 0, step: 'any' }}
          helperText="Leave empty for assets where quantity doesn't apply (e.g., Fixed Deposits)"
          fullWidth
          margin="normal"
        />

        <TextField
          label="Price per Unit"
          value={investment.price}
          onChange={e =>
            onTransactionChange({ ...investment, price: parseFloat(e.target.value) || 0 })
          }
          type="number"
          inputProps={{ min: 0, step: 'any' }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {asset.currency === 'USD' ? '$' : asset.currency === 'INR' ? '₹' : '£'}
              </InputAdornment>
            ),
          }}
          required
          fullWidth
          margin="normal"
          helperText="Include all fees and charges in the price"
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
        <Button onClick={onSubmit} disabled={isSubmitting} color="primary">
          {isSubmitting ? 'Submitting...' : 'Submit'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
