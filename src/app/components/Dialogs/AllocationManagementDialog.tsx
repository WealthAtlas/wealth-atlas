import { Asset } from '@/domain/entities/assets/Asset';
import { AssetGoalAllocation } from '@/domain/entities/goals/AssetGoalAllocation';
import { Goal } from '@/domain/entities/goals/Goal';
import { Currency } from '@/domain/entities/shared/Currency';
import { Add as AddIcon, Delete as DeleteIcon, Info as InfoIcon } from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';

interface AllocationManagementDialogProps {
  open: boolean;
  goal: Goal | null;
  assets: Asset[];
  existingAllocations: AssetGoalAllocation[];
  assetCurrentValues: Record<number, number>; // assetId -> current value
  onClose: () => void;
  onSave: (allocations: AllocationData[]) => void;
  isLoading?: boolean;
}

interface AssetAllocationRow {
  asset: Asset;
  currentValue: number;
  allocationPercentage: number;
  allocatedAmount: number;
  existingAllocationId?: number;
}

export const AllocationManagementDialog: React.FC<AllocationManagementDialogProps> = ({
  open,
  goal,
  assets,
  existingAllocations,
  assetCurrentValues,
  onClose,
  onSave,
  isLoading = false,
}) => {
  const [allocations, setAllocations] = useState<AssetAllocationRow[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [selectedAssetId, setSelectedAssetId] = useState<number | ''>('');

  // Initialize allocations when dialog opens
  useEffect(() => {
    if (open && goal) {
      const initialAllocations: AssetAllocationRow[] = [];

      // Add existing allocations
      existingAllocations.forEach(allocation => {
        const asset = assets.find(a => a.id === allocation.assetId);
        if (asset) {
          const currentValue = assetCurrentValues[allocation.assetId] || 0;
          initialAllocations.push({
            asset,
            currentValue,
            allocationPercentage: allocation.getAllocationPercentageDisplay(),
            allocatedAmount: allocation.getAllocatedAmount(currentValue),
            existingAllocationId: allocation.id,
          });
        }
      });

      setAllocations(initialAllocations);
      setErrors({});
    }
  }, [open, goal, existingAllocations, assets, assetCurrentValues]);

  const formatCurrency = (amount: number, currency: string): string => {
    const currencySymbols: Record<string, string> = {
      [Currency.USD]: '$',
      [Currency.GBP]: '£',
      [Currency.INR]: '₹',
    };
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getTotalAllocatedAmount = (): number => {
    return allocations.reduce((total, allocation) => total + allocation.allocatedAmount, 0);
  };

  const getAvailableAssets = (): Asset[] => {
    const allocatedAssetIds = allocations.map(a => a.asset.id);
    return assets.filter(asset => !allocatedAssetIds.includes(asset.id));
  };

  const handleAllocationPercentageChange = (assetId: number, percentage: string) => {
    const numericPercentage = parseFloat(percentage) || 0;

    setAllocations(prev =>
      prev.map(allocation => {
        if (allocation.asset.id === assetId) {
          const allocatedAmount = (allocation.currentValue * numericPercentage) / 100;
          return {
            ...allocation,
            allocationPercentage: numericPercentage,
            allocatedAmount,
          };
        }
        return allocation;
      })
    );

    // Clear error for this asset
    if (errors[assetId]) {
      setErrors(prev => ({
        ...prev,
        [assetId]: '',
      }));
    }
  };

  const handleAddAsset = (asset: Asset) => {
    const currentValue = assetCurrentValues[asset.id!] || 0;
    const newAllocation: AssetAllocationRow = {
      asset,
      currentValue,
      allocationPercentage: 10, // Default 10%
      allocatedAmount: currentValue * 0.1,
    };

    setAllocations(prev => [...prev, newAllocation]);
  };

  const handleRemoveAllocation = (assetId: number) => {
    setAllocations(prev => prev.filter(allocation => allocation.asset.id !== assetId));

    // Clear any error for this asset
    if (errors[assetId]) {
      setErrors(prev => ({
        ...prev,
        [assetId]: '',
      }));
    }
  };

  const validateAllocations = (): boolean => {
    const newErrors: Record<number, string> = {};
    let isValid = true;

    allocations.forEach(allocation => {
      const assetId = allocation.asset.id!;

      if (allocation.allocationPercentage <= 0 || allocation.allocationPercentage > 100) {
        newErrors[assetId] = 'Allocation must be between 1% and 100%';
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = () => {
    if (!goal || !validateAllocations()) {
      return;
    }

    const allocationData: AllocationData[] = allocations.map(allocation => ({
      assetId: allocation.asset.id!,
      goalId: goal.id!,
      allocationPercentage: allocation.allocationPercentage,
      existingAllocationId: allocation.existingAllocationId,
    }));

    onSave(allocationData);
  };

  const availableAssets = getAvailableAssets();
  const totalAllocatedAmount = getTotalAllocatedAmount();

  if (!goal) {
    return null;
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Typography variant="h6">Manage Allocations</Typography>
          <Chip label={goal.name} color="primary" size="small" />
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box display="flex" flexDirection="column" gap={3}>
          {/* Goal Summary */}
          <Paper sx={{ p: 2, bgcolor: 'background.default' }}>
            <Typography variant="subtitle2" gutterBottom>
              Goal Summary
            </Typography>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Typography variant="body2">
                Target: {formatCurrency(goal.targetAmount, goal.currency)}
              </Typography>
              <Typography variant="body2">
                Inflation-Adjusted:{' '}
                {formatCurrency(goal.getInflationAdjustedTarget(), goal.currency)}
              </Typography>
              <Typography variant="body2">
                Years to Maturity: {goal.getYearsToMaturity().toFixed(1)}
              </Typography>
            </Box>
          </Paper>

          {/* Current Allocations */}
          {allocations.length > 0 && (
            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">Current Allocations</Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Allocated: {formatCurrency(totalAllocatedAmount, goal.currency)}
                </Typography>
              </Box>

              <TableContainer component={Paper}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Asset</TableCell>
                      <TableCell align="right">Current Value</TableCell>
                      <TableCell align="right">Allocation %</TableCell>
                      <TableCell align="right">Allocated Amount</TableCell>
                      <TableCell align="center">Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {allocations.map(allocation => (
                      <TableRow key={allocation.asset.id}>
                        <TableCell>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {allocation.asset.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {allocation.asset.category}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(allocation.currentValue, allocation.asset.currency)}
                        </TableCell>
                        <TableCell align="right">
                          <TextField
                            size="small"
                            type="number"
                            value={allocation.allocationPercentage || ''}
                            onChange={e =>
                              handleAllocationPercentageChange(allocation.asset.id!, e.target.value)
                            }
                            error={!!errors[allocation.asset.id!]}
                            helperText={errors[allocation.asset.id!]}
                            inputProps={{ min: 1, max: 100, step: 1 }}
                            sx={{ width: 80 }}
                            InputProps={{
                              endAdornment: '%',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right">
                          {formatCurrency(allocation.allocatedAmount, goal.currency)}
                        </TableCell>
                        <TableCell align="center">
                          <Tooltip title="Remove Allocation">
                            <IconButton
                              size="small"
                              onClick={() => handleRemoveAllocation(allocation.asset.id!)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          )}

          {/* Add New Allocation */}
          {availableAssets.length > 0 && (
            <Box>
              <Typography variant="h6" mb={2}>
                Add Asset Allocation
              </Typography>

              <Box display="flex" gap={2} alignItems="center" mb={2}>
                <FormControl size="small" sx={{ minWidth: 300, flex: 1 }}>
                  <InputLabel>Select Asset to Add</InputLabel>
                  <Select
                    value={selectedAssetId}
                    onChange={e => setSelectedAssetId(e.target.value as number | '')}
                    label="Select Asset to Add"
                  >
                    <MenuItem value="">Choose an asset...</MenuItem>
                    {availableAssets.map(asset => {
                      const currentValue = assetCurrentValues[asset.id!] || 0;
                      return (
                        <MenuItem key={asset.id} value={asset.id}>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {asset.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {asset.category} • {formatCurrency(currentValue, asset.currency)}
                            </Typography>
                          </Box>
                        </MenuItem>
                      );
                    })}
                  </Select>
                </FormControl>

                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    if (selectedAssetId) {
                      const asset = availableAssets.find(a => a.id === selectedAssetId);
                      if (asset) {
                        handleAddAsset(asset);
                        setSelectedAssetId('');
                      }
                    }
                  }}
                  disabled={!selectedAssetId}
                >
                  Add
                </Button>
              </Box>
            </Box>
          )}

          {/* No Assets Available */}
          {availableAssets.length === 0 && assets.length > 0 && (
            <Alert severity="info">
              All available assets have been allocated to this goal. You can adjust existing
              allocations or remove allocations to add different assets.
            </Alert>
          )}

          {/* No Assets at All */}
          {assets.length === 0 && (
            <Alert severity="warning">
              No assets available for allocation. Please create some assets first before setting up
              goal allocations.
            </Alert>
          )}

          {/* Allocation Tips */}
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <InfoIcon color="info" fontSize="small" />
              <Typography variant="subtitle2">Allocation Tips</Typography>
            </Box>
            <Box component="ul" sx={{ pl: 2, m: 0 }}>
              <Typography component="li" variant="body2" color="text.secondary">
                Over-allocation (total &gt; 100%) is allowed for conservative planning
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Each allocation percentage is based on the asset&apos;s current value
              </Typography>
              <Typography component="li" variant="body2" color="text.secondary">
                Progress calculations use each asset&apos;s historical IRR for projections
              </Typography>
            </Box>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={isLoading || allocations.length === 0}
        >
          Save Allocations
        </Button>
      </DialogActions>
    </Dialog>
  );
};
