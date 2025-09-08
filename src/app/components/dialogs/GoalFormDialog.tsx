import { Asset } from '@/domain/entities/assets/Asset';
import { Goal, IGoal } from '@/domain/entities/goals/Goal';
import { Add, Delete } from '@mui/icons-material';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import { Logger } from '../../../domain/utils/Logger';

export interface GoalFormDialogProps {
  goal?: Goal;
  availableAssets: Asset[];
  open: boolean;
  onClose: () => void;
  onSave: (
    goalData: IGoal,
    assetAllocations: { assetId: number; percentage: number }[]
  ) => Promise<void>;
}

interface AssetAllocation {
  assetId: number;
  percentage: number;
}

export function GoalFormDialog({
  goal,
  availableAssets,
  open,
  onClose,
  onSave,
}: GoalFormDialogProps) {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [maturityDate, setMaturityDate] = useState('');
  const [inflationRate, setInflationRate] = useState<number>(6); // Default 6%
  const [currency, setCurrency] = useState('INR');
  const [assetAllocations, setAssetAllocations] = useState<AssetAllocation[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (goal) {
      setName(goal.name);
      setTargetAmount(goal.targetAmount);
      setMaturityDate(goal.maturityDate.toISOString().split('T')[0]);
      setInflationRate(goal.inflationRate * 100); // Convert to percentage
      setCurrency(goal.currency);
      setAssetAllocations(
        goal.allocations.map(allocation => ({
          assetId: allocation.assetId,
          percentage: allocation.allocationPercentage,
        }))
      );
    } else {
      resetForm();
    }
  }, [goal, open]);

  const resetForm = () => {
    setName('');
    setTargetAmount(0);
    setMaturityDate('');
    setInflationRate(6);
    setCurrency('INR');
    setAssetAllocations([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const goalData: IGoal = {
        id: goal?.id,
        name: name.trim(),
        targetAmount,
        maturityDate: new Date(maturityDate),
        inflationRate: inflationRate / 100, // Convert to decimal
        currency,
        createdAt: goal?.createdAt || new Date(),
      };

      await onSave(goalData, assetAllocations);
    } catch (error) {
      Logger.error('Failed to save goal:', error);
    } finally {
      setLoading(false);
    }
  };

  const addAssetAllocation = () => {
    setAssetAllocations([...assetAllocations, { assetId: 0, percentage: 0 }]);
  };

  const removeAssetAllocation = (index: number) => {
    setAssetAllocations(assetAllocations.filter((_, i) => i !== index));
  };

  const updateAssetAllocation = (index: number, field: keyof AssetAllocation, value: number) => {
    const updated = [...assetAllocations];
    updated[index] = { ...updated[index], [field]: value };
    setAssetAllocations(updated);
  };

  const totalAllocationPercentage = assetAllocations.reduce(
    (sum, allocation) => sum + allocation.percentage,
    0
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>{goal ? 'Edit Goal' : 'Add New Goal'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                autoFocus
                margin="dense"
                label="Goal Name"
                fullWidth
                variant="outlined"
                value={name}
                onChange={e => setName(e.target.value)}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Target Amount"
                type="number"
                fullWidth
                variant="outlined"
                value={targetAmount}
                onChange={e => setTargetAmount(Number(e.target.value))}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <FormControl fullWidth variant="outlined" margin="dense">
                <InputLabel>Currency</InputLabel>
                <Select
                  value={currency}
                  onChange={e => setCurrency(e.target.value)}
                  label="Currency"
                >
                  <MenuItem value="INR">INR</MenuItem>
                  <MenuItem value="USD">USD</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Maturity Date"
                type="date"
                fullWidth
                variant="outlined"
                value={maturityDate}
                onChange={e => setMaturityDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                margin="dense"
                label="Inflation Rate (%)"
                type="number"
                fullWidth
                variant="outlined"
                value={inflationRate}
                onChange={e => setInflationRate(Number(e.target.value))}
                inputProps={{ step: 0.1, min: 0, max: 20 }}
                required
              />
            </Grid>

            <Grid item xs={12}>
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h6">Asset Allocations</Typography>
                <Button startIcon={<Add />} onClick={addAssetAllocation}>
                  Add Asset
                </Button>
              </Box>

              {assetAllocations.map((allocation, index) => (
                <Box key={index} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center' }}>
                  <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Asset</InputLabel>
                    <Select
                      value={allocation.assetId}
                      onChange={e =>
                        updateAssetAllocation(index, 'assetId', Number(e.target.value))
                      }
                      label="Asset"
                    >
                      {availableAssets.map(asset => (
                        <MenuItem key={asset.id} value={asset.id}>
                          {asset.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    label="Percentage"
                    type="number"
                    value={allocation.percentage}
                    onChange={e =>
                      updateAssetAllocation(index, 'percentage', Number(e.target.value))
                    }
                    inputProps={{ min: 0, max: 100 }}
                    sx={{ width: 120 }}
                  />

                  <IconButton onClick={() => removeAssetAllocation(index)}>
                    <Delete />
                  </IconButton>
                </Box>
              ))}

              {assetAllocations.length > 0 && (
                <Typography
                  variant="body2"
                  color={totalAllocationPercentage === 100 ? 'success.main' : 'warning.main'}
                >
                  Total Allocation: {totalAllocationPercentage}%
                  {totalAllocationPercentage !== 100 && ' (Should total 100%)'}
                </Typography>
              )}
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
