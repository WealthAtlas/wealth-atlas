import { Asset } from '@/domain/entities/Asset';
import { AssetTransaction } from '@/domain/entities/AssetTransaction';
import {
  Box,
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
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

export interface TransactionFormData {
  transactionType: 'buy' | 'sell';
  quantity: string;
  price: string;
  date: string; // Use string for HTML date input
}

export interface TransactionFormDialogProps {
  open: boolean;
  asset: Asset | null;
  transactionToEdit?: AssetTransaction | null;
  onClose: () => void;
  onSubmit: (formData: TransactionFormData) => void;
  isLoading?: boolean;
}

export function TransactionFormDialog({
  open,
  asset,
  transactionToEdit,
  onClose,
  onSubmit,
  isLoading = false,
}: TransactionFormDialogProps) {
  const [formData, setFormData] = useState<TransactionFormData>({
    transactionType: 'buy',
    quantity: '',
    price: '',
    date: new Date().toISOString().split('T')[0], // Format as YYYY-MM-DD
  });

  const isEditMode = !!transactionToEdit;

  // Populate form when editing
  useEffect(() => {
    if (transactionToEdit) {
      setFormData({
        transactionType: transactionToEdit.transactionType,
        quantity: transactionToEdit.quantity?.toString() || '',
        price: transactionToEdit.price.toString(),
        date: new Date(transactionToEdit.date).toISOString().split('T')[0],
      });
    } else {
      // Reset form for new transaction
      setFormData({
        transactionType: 'buy',
        quantity: '',
        price: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
  }, [transactionToEdit, open]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    onSubmit(formData);
  };

  const handleClose = () => {
    // Reset form when closing
    setFormData({
      transactionType: 'buy',
      quantity: '',
      price: '',
      date: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  if (!asset) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {isEditMode ? 'Edit Transaction' : 'Add Transaction'} for {asset.name}
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Category: {asset.category}
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
            <FormControl component="fieldset">
              <FormLabel component="legend">Transaction Type</FormLabel>
              <RadioGroup
                row
                value={formData.transactionType}
                onChange={e =>
                  setFormData((prev: TransactionFormData) => ({
                    ...prev,
                    transactionType: e.target.value as 'buy' | 'sell',
                  }))
                }
              >
                <FormControlLabel value="buy" control={<Radio />} label="Buy" />
                <FormControlLabel value="sell" control={<Radio />} label="Sell" />
              </RadioGroup>
            </FormControl>

            <TextField
              label="Quantity"
              value={formData.quantity}
              onChange={e =>
                setFormData((prev: TransactionFormData) => ({ ...prev, quantity: e.target.value }))
              }
              type="number"
              inputProps={{ min: 0, step: 'any' }}
              helperText="Leave empty for assets where quantity doesn't apply (e.g., Fixed Deposits)"
              fullWidth
            />

            <TextField
              label="Price per Unit"
              value={formData.price}
              onChange={e =>
                setFormData((prev: TransactionFormData) => ({ ...prev, price: e.target.value }))
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
              helperText="Include all fees and charges in the price"
            />

            <TextField
              label="Transaction Date"
              value={formData.date}
              onChange={e =>
                setFormData((prev: TransactionFormData) => ({ ...prev, date: e.target.value }))
              }
              type="date"
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={isLoading}>
            {isLoading
              ? isEditMode
                ? 'Updating...'
                : 'Adding...'
              : isEditMode
                ? 'Update Transaction'
                : 'Add Transaction'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
