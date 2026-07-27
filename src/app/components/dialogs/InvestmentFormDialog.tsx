import { validateInvestment } from '@/domain/validation/EntityValidators';
import { isValid } from '@/domain/validation/ValidationIssue';
import { IAsset } from '@/domain/entities/assets/Asset';
import { IInvestment, InvestmentType } from '@/domain/entities/assets/Investment';
import { getCurrencySymbol } from '@/domain/entities/shared/Currency';
import {
  TrendingUp as BuyIcon,
  Calculate as CalculateIcon,
  CalendarToday as CalendarIcon,
  AccountBalance as InvestmentIcon,
  Timeline as QuantityIcon,
  TrendingDown as SellIcon,
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  InputAdornment,
  Radio,
  RadioGroup,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEffect, useState } from 'react';

export interface InvestmentFormDialogProps {
  open: boolean;
  title: string;
  asset: IAsset;
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
  const [formattedAmount, setFormattedAmount] = useState<string>('');
  const [formattedQuantity, setFormattedQuantity] = useState<string>('');

  // Sync formatted values with investment data
  useEffect(() => {
    if (investment.totalAmount > 0) {
      setFormattedAmount(formatDisplayAmount(investment.totalAmount));
    } else {
      setFormattedAmount('');
    }

    if (investment.quantity && investment.quantity > 0) {
      setFormattedQuantity(investment.quantity.toString());
    } else {
      setFormattedQuantity('');
    }
  }, [investment.totalAmount, investment.quantity]);

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

  const handleAmountChange = (value: string) => {
    // Allow only numbers and decimal point with up to 2 decimal places
    if (value === '' || /^\d*\.?\d{0,2}$/.test(value)) {
      setFormattedAmount(value);
      const numericValue = parseDisplayAmount(value);
      onTransactionChange({
        ...investment,
        totalAmount: numericValue,
      });
    }
  };

  const handleAmountBlur = () => {
    // Format on blur for consistent display
    if (formattedAmount && investment.totalAmount > 0) {
      setFormattedAmount(formatDisplayAmount(investment.totalAmount));
    }
  };

  const handleQuantityChange = (value: string) => {
    // Allow numbers and decimal for quantity
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setFormattedQuantity(value);
      const numericValue = parseFloat(value) || undefined;
      onTransactionChange({
        ...investment,
        quantity: numericValue,
      });
    }
  };

  const formatDateForInput = (date: Date | undefined): string => {
    if (!date) return new Date().toISOString().split('T')[0];
    return date.toISOString().split('T')[0];
  };

  const getTransactionIcon = (type: InvestmentType) => {
    return type === InvestmentType.BUY ? (
      <BuyIcon sx={{ color: 'success.main' }} />
    ) : (
      <SellIcon sx={{ color: 'error.main' }} />
    );
  };

  const getTransactionColor = (type: InvestmentType) => {
    return type === InvestmentType.BUY ? 'success' : 'error';
  };

  const calculateUnitPrice = (): number => {
    if (investment.totalAmount > 0 && investment.quantity && investment.quantity > 0) {
      return investment.totalAmount / investment.quantity;
    }
    return 0;
  };

  const isFormValid = isValid(validateInvestment(investment));

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
          <InvestmentIcon color="primary" />
          <Typography variant="h6" component="div">
            {title}
          </Typography>
          <Chip label={asset.name} color="primary" variant="outlined" size="small" />
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ pt: 2 }}>
          {/* Transaction Type */}
          <Card variant="outlined">
            <CardContent sx={{ pb: 2 }}>
              <FormControl component="fieldset" fullWidth>
                <FormLabel component="legend" sx={{ mb: 2, fontWeight: 'bold' }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {getTransactionIcon(investment.type || InvestmentType.BUY)}
                    <Typography variant="subtitle1">Transaction Type</Typography>
                  </Stack>
                </FormLabel>
                <RadioGroup
                  row
                  value={investment.type || InvestmentType.BUY}
                  onChange={e =>
                    onTransactionChange({
                      ...investment,
                      type: e.target.value as InvestmentType,
                    })
                  }
                  sx={{ gap: 3 }}
                >
                  <FormControlLabel
                    value={InvestmentType.BUY}
                    control={<Radio color="success" />}
                    label={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <BuyIcon sx={{ color: 'success.main', fontSize: 20 }} />
                        <Typography>Buy / Invest</Typography>
                      </Stack>
                    }
                  />
                  <FormControlLabel
                    value={InvestmentType.SELL}
                    control={<Radio color="error" />}
                    label={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <SellIcon sx={{ color: 'error.main', fontSize: 20 }} />
                        <Typography>Sell / Redeem</Typography>
                      </Stack>
                    }
                  />
                </RadioGroup>
              </FormControl>
            </CardContent>
          </Card>

          <Divider />

          {/* Date and Amount Row */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField
              label="Transaction Date"
              value={formatDateForInput(investment.date)}
              onChange={e =>
                onTransactionChange({
                  ...investment,
                  date: e.target.value ? new Date(e.target.value) : new Date(),
                })
              }
              type="date"
              InputLabelProps={{ shrink: true }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <CalendarIcon color="action" />
                  </InputAdornment>
                ),
              }}
              required
              fullWidth
            />

            <Box flexGrow={1}>
              <TextField
                label="Total Amount"
                value={formattedAmount}
                onChange={e => handleAmountChange(e.target.value)}
                onBlur={handleAmountBlur}
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
                helperText="Total amount invested (including fees)"
              />
              {formattedAmount && investment.totalAmount > 0 && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ ml: 1, mt: 0.5, display: 'block' }}
                >
                  Formatted: {getCurrencySymbol(asset.currency)}{' '}
                  {formatDisplayAmount(investment.totalAmount)}
                </Typography>
              )}
            </Box>
          </Stack>

          {/* Quantity */}
          <Box>
            <TextField
              label="Quantity / Units"
              value={formattedQuantity}
              onChange={e => handleQuantityChange(e.target.value)}
              type="text"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <QuantityIcon color="action" />
                  </InputAdornment>
                ),
              }}
              inputProps={{
                inputMode: 'decimal',
                pattern: '[0-9]*\\.?[0-9]*',
                style: { textAlign: 'right' },
              }}
              helperText="Number of units/shares (optional for lump sum investments)"
              fullWidth
            />
          </Box>

          {/* Calculations Card */}
          {investment.totalAmount > 0 && investment.quantity && investment.quantity > 0 && (
            <Card variant="outlined" sx={{ bgcolor: 'grey.50' }}>
              <CardContent>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                  <CalculateIcon color="primary" />
                  <Typography variant="subtitle1" fontWeight="bold">
                    Investment Summary
                  </Typography>
                </Stack>

                <Stack spacing={1}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Total Amount:
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {getCurrencySymbol(asset.currency)}{' '}
                      {formatDisplayAmount(investment.totalAmount)}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Quantity:
                    </Typography>
                    <Typography variant="body1" fontWeight="bold">
                      {investment.quantity} units
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Typography variant="body2" color="text.secondary">
                      Price per Unit:
                    </Typography>
                    <Typography variant="body1" fontWeight="bold" color="primary.main">
                      {getCurrencySymbol(asset.currency)}{' '}
                      {formatDisplayAmount(calculateUnitPrice())}
                    </Typography>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          )}

          {/* Validation Alert */}
          {!isFormValid && formattedAmount && (
            <Alert severity="warning" variant="outlined">
              Please ensure all required fields are filled correctly.
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
          color={getTransactionColor(investment.type || InvestmentType.BUY)}
          variant="contained"
          size="large"
          startIcon={getTransactionIcon(investment.type || InvestmentType.BUY)}
          sx={{ minWidth: 140 }}
        >
          {isSubmitting
            ? 'Processing...'
            : `${investment.type === InvestmentType.SELL ? 'Sell' : 'Buy'} ${asset.name}`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
