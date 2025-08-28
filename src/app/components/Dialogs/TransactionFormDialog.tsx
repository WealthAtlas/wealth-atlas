import { Asset } from '@/domain/entities/assets/Asset';
import { IAssetTransaction } from '@/domain/entities/assets/AssetTransaction';
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
import { useEffect } from 'react';

export interface TransactionFormDialogProps {
  open: boolean;
  title: string;
  asset: Asset | null;
  transaction: IAssetTransaction;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onTransactionChange: (transaction: IAssetTransaction) => void;
}

export function TransactionFormDialog({
  open,
  title,
  asset,
  transaction,
  isSubmitting,
  onClose,
  onSubmit,
  onTransactionChange,
}: TransactionFormDialogProps) {
  // Populate form when editing
  useEffect(() => {
    if (open && transaction) {
      onTransactionChange({
        id: transaction.id,
        assetId: transaction.assetId,
        quantity: transaction.quantity,
        price: transaction.price,
        date: transaction.date,
      });
    }
  }, [open, transaction, onTransactionChange]);

  if (!asset) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <FormControl component="fieldset" margin="normal">
          <FormLabel component="legend">Transaction Type</FormLabel>
          <RadioGroup
            row
            value={transaction.price > 0 ? 'buy' : 'sell'}
            onChange={e =>
              onTransactionChange({
                ...transaction,
                quantity:
                  e.target.value == 'buy'
                    ? transaction.quantity || 1
                    : -(transaction.quantity || -1),
                price:
                  e.target.value == 'buy' ? transaction.price || 0 : -(transaction.price || -1),
              })
            }
          >
            <FormControlLabel value="buy" control={<Radio />} label="Buy" />
            <FormControlLabel value="sell" control={<Radio />} label="Sell" />
          </RadioGroup>
        </FormControl>

        <TextField
          label="Quantity"
          value={transaction.quantity}
          onChange={e =>
            onTransactionChange({ ...transaction, quantity: parseFloat(e.target.value) || 0 })
          }
          type="number"
          inputProps={{ min: 0, step: 'any' }}
          helperText="Leave empty for assets where quantity doesn't apply (e.g., Fixed Deposits)"
          fullWidth
          margin="normal"
        />

        <TextField
          label="Price per Unit"
          value={transaction.price}
          onChange={e =>
            onTransactionChange({ ...transaction, price: parseFloat(e.target.value) || 0 })
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
          value={transaction.date?.toISOString().split('T')[0] || ''}
          onChange={e =>
            onTransactionChange({
              ...transaction,
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
