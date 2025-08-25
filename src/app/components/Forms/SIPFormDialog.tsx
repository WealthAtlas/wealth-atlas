import {
  Box,
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
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { InvestmentFrequency } from '../../../domain/entities/assets/InvestmentFrequency';
import { ScheduledAssetTransaction } from '../../../domain/entities/assets/ScheduledAssetTransaction';

interface SIPFormDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (scheduledTransaction: Partial<ScheduledAssetTransaction>) => void;
  assetId: number;
  assetName: string;
  editingSIP?: ScheduledAssetTransaction | null;
}

export const SIPFormDialog: React.FC<SIPFormDialogProps> = ({
  open,
  onClose,
  onSubmit,
  assetId,
  assetName,
  editingSIP,
}) => {
  const [formData, setFormData] = useState({
    price: '0',
    quantity: '1',
    frequency: InvestmentFrequency.MONTHLY,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    totalOccurrences: '',
  });

  // Populate form when editing
  useEffect(() => {
    if (editingSIP) {
      setFormData({
        price: editingSIP.price.toString(),
        quantity: editingSIP.quantity?.toString() || '1',
        frequency: editingSIP.frequency,
        startDate: editingSIP.startDate.toISOString().split('T')[0],
        endDate: editingSIP.endDate ? editingSIP.endDate.toISOString().split('T')[0] : '',
        totalOccurrences: editingSIP.totalOccurrences?.toString() || '',
      });
    } else {
      // Reset form for new SIP
      setFormData({
        price: '0',
        quantity: '1',
        frequency: InvestmentFrequency.MONTHLY,
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        totalOccurrences: '',
      });
    }
  }, [editingSIP, open]);

  const handleSubmit = () => {
    const scheduledTransaction = new ScheduledAssetTransaction(
      editingSIP?.id || 0, // Use existing ID when editing
      assetId,
      'buy', // transaction type
      parseFloat(formData.quantity) || 1,
      parseFloat(formData.price),
      new Date(formData.startDate),
      formData.frequency,
      formData.endDate ? new Date(formData.endDate) : undefined,
      formData.totalOccurrences ? parseInt(formData.totalOccurrences) : undefined,
      true, // isActive
      editingSIP?.isExecuted || false, // preserve executed status when editing
      editingSIP?.executedTransactionId // preserve executed transaction ID when editing
    );

    onSubmit(scheduledTransaction);
    onClose();
  };

  const calculateMonthlyAmount = () => {
    const price = parseFloat(formData.price) || 0;
    const quantity = parseFloat(formData.quantity) || 0;
    return price * quantity;
  };

  const calculateTotalInvestment = () => {
    const monthlyAmount = calculateMonthlyAmount();
    const occurrences = parseInt(formData.totalOccurrences) || 0;
    return monthlyAmount * occurrences;
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {editingSIP ? 'Edit SIP for' : 'Setup SIP for'} {assetName}
      </DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Configure a Systematic Investment Plan (SIP) to automatically invest in this asset at
              regular intervals.
            </Typography>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              name="price"
              label="Investment Amount per Unit"
              type="number"
              value={formData.price}
              onChange={e => setFormData({ ...formData, price: e.target.value })}
              InputProps={{ startAdornment: '$' }}
              helperText="Amount to invest per unit/share"
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              name="quantity"
              label="Quantity per Investment"
              type="number"
              value={formData.quantity}
              onChange={e => setFormData({ ...formData, quantity: e.target.value })}
              helperText="Number of units/shares to buy each time"
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Investment Frequency</InputLabel>
              <Select
                name="frequency"
                value={formData.frequency}
                label="Investment Frequency"
                onChange={e =>
                  setFormData({ ...formData, frequency: e.target.value as InvestmentFrequency })
                }
              >
                <MenuItem value={InvestmentFrequency.MONTHLY}>Monthly</MenuItem>
                <MenuItem value={InvestmentFrequency.QUARTERLY}>Quarterly</MenuItem>
                <MenuItem value={InvestmentFrequency.SEMI_ANNUALLY}>Semi-Annually</MenuItem>
                <MenuItem value={InvestmentFrequency.ANNUALLY}>Annually</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              name="startDate"
              label="Start Date"
              type="date"
              value={formData.startDate}
              onChange={e => setFormData({ ...formData, startDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              name="endDate"
              label="End Date (Optional)"
              type="date"
              value={formData.endDate}
              onChange={e => setFormData({ ...formData, endDate: e.target.value })}
              InputLabelProps={{ shrink: true }}
              helperText="Leave empty for indefinite SIP"
            />
          </Grid>

          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              name="totalOccurrences"
              label="Total Occurrences (Optional)"
              type="number"
              value={formData.totalOccurrences}
              onChange={e => setFormData({ ...formData, totalOccurrences: e.target.value })}
              helperText="Total number of investments (overrides end date)"
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Typography variant="h6" gutterBottom>
                SIP Summary
              </Typography>
              <Typography variant="body2">
                Investment per {formData.frequency.toLowerCase()}:{' '}
                <strong>${calculateMonthlyAmount().toFixed(2)}</strong>
              </Typography>
              {formData.totalOccurrences && (
                <Typography variant="body2">
                  Total Investment: <strong>${calculateTotalInvestment().toFixed(2)}</strong> over{' '}
                  {formData.totalOccurrences} payments
                </Typography>
              )}
            </Box>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={
            !formData.price ||
            !formData.quantity ||
            parseFloat(formData.price) <= 0 ||
            parseFloat(formData.quantity) <= 0
          }
        >
          {editingSIP ? 'Update SIP' : 'Create SIP'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
