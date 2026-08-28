import { validateSIP } from '@/domain/validation/EntityValidators';
import { isValid } from '@/domain/validation/ValidationIssue';
import { getCurrencySymbol } from '@/domain/entities/shared/Currency';
import { TrendingUp } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { IAsset } from '../../../domain/entities/assets/Asset';
import { ISIP } from '../../../domain/entities/assets/SIP';
import { Frequency } from '../../../domain/entities/shared/Frequency';
import { parseUtcDay } from '@/domain/utils/DateUtils';

export interface SIPFormDialogProps {
  open: boolean;
  title: string;
  asset: IAsset;
  sip: ISIP;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: () => void;
  onSIPChange: (sip: ISIP) => void;
}

export function SIPFormDialog({
  open,
  title,
  asset,
  sip,
  isSubmitting,
  onClose,
  onSubmit,
  onSIPChange,
}: SIPFormDialogProps) {
  const [formattedPrice, setFormattedPrice] = useState<string>('');
  const [formattedQuantity, setFormattedQuantity] = useState<string>('');

  // Sync formatted values with SIP data
  useEffect(() => {
    if (sip.price > 0) {
      setFormattedPrice(formatDisplayAmount(sip.price));
    } else {
      setFormattedPrice('');
    }

    if (sip.quantity && sip.quantity > 0) {
      setFormattedQuantity(formatDisplayQuantity(sip.quantity));
    } else {
      setFormattedQuantity('');
    }
  }, [sip.price, sip.quantity]);

  // Format amount for display with proper decimal places
  const formatDisplayAmount = (value: number): string => {
    if (value === 0) return '';
    return value.toFixed(2).replace(/\.?0+$/, ''); // Remove trailing zeros
  };

  // Format quantity for display
  const formatDisplayQuantity = (value: number): string => {
    if (value === 0) return '';
    // For quantities, we might want more precision or different formatting
    return value.toString();
  };

  // Parse display quantity to number
  const parseDisplayQuantity = (value: string): number => {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
  };

  // Parse display amount to number
  const parseDisplayAmount = (value: string): number => {
    const cleaned = value.replace(/[^\d.]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : Math.round(parsed * 100) / 100; // Round to 2 decimal places
  };

  const handlePriceChange = (value: string) => {
    // Allow only numbers and decimal point with up to 2 decimal places
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setFormattedPrice(value);
      const numericValue = parseDisplayAmount(value);
      onSIPChange({
        ...sip,
        price: numericValue,
      });
    }
  };

  const handleQuantityChange = (value: string) => {
    // Allow only numbers and decimal point
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormattedQuantity(value);
      const numericValue = parseDisplayQuantity(value);
      onSIPChange({
        ...sip,
        quantity: numericValue > 0 ? numericValue : undefined,
      });
    }
  };

  const handlePriceBlur = () => {
    // Format on blur for consistent display
    if (formattedPrice && sip.price > 0) {
      setFormattedPrice(formatDisplayAmount(sip.price));
    }
  };

  const handleQuantityBlur = () => {
    // Format on blur for consistent display
    if (formattedQuantity && sip.quantity && sip.quantity > 0) {
      setFormattedQuantity(formatDisplayQuantity(sip.quantity));
    }
  };

  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return new Date().toISOString().split('T')[0];
    return date.toISOString().split('T')[0];
  };

  const handleFrequencyChange = (value: string) => {
    onSIPChange({
      ...sip,
      frequency: value as Frequency,
    });
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    onSIPChange({
      ...sip,
      [field]: parseUtcDay(value),
    });
  };

  const isFormValid = isValid(validateSIP(sip));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{
        sx: { borderRadius: 2 },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <TrendingUp color="primary" />
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          <Chip label={asset.name} color="primary" variant="outlined" size="small" />
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ pt: 2 }}>
          {/* Date Range */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Start Date"
              value={formatDateForInput(sip.startDate)}
              onChange={e => handleDateChange('startDate', e.target.value)}
              type="date"
              InputLabelProps={{ shrink: true }}
              required
              fullWidth
              helperText="When SIP investments begin"
            />

            <TextField
              label="End Date"
              value={formatDateForInput(sip.endDate)}
              onChange={e => handleDateChange('endDate', e.target.value)}
              type="date"
              InputLabelProps={{ shrink: true }}
              fullWidth
              helperText="Optional: When SIP investments end"
            />
          </Stack>

          {/* Frequency */}
          <TextField
            label="Investment Frequency"
            value={sip.frequency}
            onChange={e => handleFrequencyChange(e.target.value)}
            select
            SelectProps={{ native: true }}
            required
            fullWidth
            helperText="How often to invest"
          >
            <option value="">Select Frequency</option>
            {Object.values(Frequency).map(freq => (
              <option key={freq} value={freq}>
                {freq.charAt(0) + freq.slice(1).toLowerCase().replace('_', ' ')}
              </option>
            ))}
          </TextField>

          {/* Investment Amount and Quantity */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Investment Amount"
              value={formattedPrice}
              onChange={e => handlePriceChange(e.target.value)}
              onBlur={handlePriceBlur}
              type="text"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Typography variant="body1" color="primary" fontWeight="bold">
                      {getCurrencySymbol(asset.currency)}
                    </Typography>
                  </InputAdornment>
                ),
              }}
              inputProps={{
                inputMode: 'decimal',
                pattern: '[0-9]*\\.?[0-9]*',
                style: { fontSize: '1.1rem', fontWeight: '500', textAlign: 'right' },
              }}
              required
              fullWidth
              helperText="Amount to invest per period"
            />

            <TextField
              label="Quantity (Optional)"
              value={formattedQuantity}
              onChange={e => handleQuantityChange(e.target.value)}
              onBlur={handleQuantityBlur}
              type="text"
              inputProps={{
                inputMode: 'decimal',
                pattern: '[0-9]*\\.?[0-9]*',
                style: { fontSize: '1.1rem', fontWeight: '500', textAlign: 'right' },
              }}
              fullWidth
              helperText="Specific quantity to purchase (if applicable)"
            />
          </Stack>

          {/* Investment Summary */}
          {formattedPrice && sip.price > 0 && (
            <Box sx={{ backgroundColor: 'grey.50', p: 2, borderRadius: 1 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                SIP Schedule Summary:
              </Typography>
              <Typography variant="body1" fontWeight="medium">
                {getCurrencySymbol(asset.currency)} {formatDisplayAmount(sip.price)} per{' '}
                {sip.frequency.toLowerCase().replace('_', ' ')}
                {sip.quantity && ` (${formatDisplayQuantity(sip.quantity)} units)`}
              </Typography>
              {sip.startDate && (
                <Typography variant="body2" color="text.secondary">
                  Starting from {sip.startDate.toLocaleDateString(undefined, { timeZone: 'UTC' })}
                  {sip.endDate &&
                    ` until ${sip.endDate.toLocaleDateString(undefined, { timeZone: 'UTC' })}`}
                </Typography>
              )}
            </Box>
          )}

          {/* Validation Alert */}
          {!isFormValid && (formattedPrice || sip.frequency) && (
            <Alert severity="warning" variant="outlined">
              Please fill in all required fields: start date, frequency, and investment amount.
            </Alert>
          )}
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
          size="large"
          sx={{ minWidth: 140 }}
        >
          {isSubmitting ? 'Creating...' : 'Create SIP'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
