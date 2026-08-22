import { Currency, getCurrencySymbol } from '@/domain/entities/shared/Currency';
import { CurrencyConverter } from '@/domain/entities/shared/CurrencyConverter';
import { Asset } from '@/domain/entities/assets/Asset';
import { Goal, IGoal } from '@/domain/entities/goals/Goal';
import { AccountBalance, Add, Delete, TrendingUp } from '@mui/icons-material';
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
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Select,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Logger } from '../../../domain/utils/Logger';
import { UIUtils } from '../../utils/UIUtils';

export interface GoalFormDialogProps {
  goal?: Goal;
  availableAssets: Asset[];
  /** Codes the user has configured; the picker offers these. */
  currencies: Currency[];
  /**
   * Allocated assets can be in a different currency from the goal being
   * authored, so their values are translated into the goal's currency before
   * they are summed or compared against the target.
   */
  converter: CurrencyConverter;
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

interface ProgressMetrics {
  totalAllocatedValue: number;
  inflatedTargetAmount: number;
  progressPercentage: number;
  yearsToGoal: number;
  monthlyRequiredSIP: number;
}

const steps = ['Basic Details', 'Asset Allocation', 'Review & Save'];

export function GoalFormDialog({
  goal,
  availableAssets,
  currencies,
  converter,
  open,
  onClose,
  onSave,
}: GoalFormDialogProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState<number>(0);
  const [maturityDate, setMaturityDate] = useState('');
  const [inflationRate, setInflationRate] = useState<number>(6); // Default 6%
  const [currency, setCurrency] = useState<Currency>(converter.getBaseCurrency());
  const [assetAllocations, setAssetAllocations] = useState<AssetAllocation[]>([]);
  const [loading, setLoading] = useState(false);

  const resetForm = useCallback(() => {
    setActiveStep(0);
    setName('');
    setTargetAmount(0);
    setMaturityDate('');
    setInflationRate(6);
    setCurrency(converter.getBaseCurrency());
    setAssetAllocations([]);
  }, [converter]);

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
  }, [goal, open, availableAssets, resetForm]);

  // Calculate progress metrics based on current form values
  const progressMetrics = useMemo((): ProgressMetrics => {
    const currentDate = new Date();
    const goalDate = maturityDate ? new Date(maturityDate) : currentDate;
    const yearsToGoal = Math.max(
      0,
      (goalDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25)
    );

    // Calculate inflation-adjusted target
    const inflatedTargetAmount =
      yearsToGoal > 0
        ? targetAmount * Math.pow(1 + inflationRate / 100, yearsToGoal)
        : targetAmount;

    // Calculate total allocated value from assets
    const totalAllocatedValue = assetAllocations.reduce((sum, allocation) => {
      const asset = availableAssets.find(a => a.id === allocation.assetId);
      if (!asset) return sum;

      const assetValue = converter.convert(
        asset.getValueOn(goal!.maturityDate, true) || 0,
        asset.currency,
        currency
      );
      return sum + (assetValue * allocation.percentage) / 100;
    }, 0);

    // Calculate progress percentage
    const progressPercentage =
      inflatedTargetAmount > 0
        ? Math.min((totalAllocatedValue / inflatedTargetAmount) * 100, 100)
        : 0;

    const calculateMonthlySIP = (
      futureValue: number,
      years: number,
      annualRate: number
    ): number => {
      const monthlyRate = annualRate / 100 / 12;
      const months = years * 12;

      if (monthlyRate === 0) return futureValue / months;

      return (futureValue * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);
    };

    // Calculate required monthly SIP (assuming 12% average return)
    const monthlyRequiredSIP =
      yearsToGoal > 0 && inflatedTargetAmount > totalAllocatedValue
        ? calculateMonthlySIP(inflatedTargetAmount - totalAllocatedValue, yearsToGoal, 12)
        : 0;

    return {
      totalAllocatedValue,
      inflatedTargetAmount,
      progressPercentage,
      yearsToGoal,
      monthlyRequiredSIP,
    };
  }, [
    targetAmount,
    maturityDate,
    inflationRate,
    assetAllocations,
    availableAssets,
    goal,
    converter,
    currency,
  ]);

  const handleNext = () => {
    setActiveStep(prev => prev + 1);
  };

  const handleBack = () => {
    setActiveStep(prev => prev - 1);
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

      // Convert to the format expected by the service
      const percentageAllocations = assetAllocations.map(allocation => ({
        assetId: allocation.assetId,
        percentage: allocation.percentage,
      }));

      await onSave(goalData, percentageAllocations);
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

  const totalAllocatedAmount = assetAllocations.reduce((sum, allocation) => {
    const asset = availableAssets.find(a => a.id === allocation.assetId);
    if (!asset) return sum;
    const assetValue = converter.convert(
      asset.getValueOn(goal!.maturityDate, true) || 0,
      asset.currency,
      currency
    );
    return sum + (assetValue * allocation.percentage) / 100;
  }, 0);

  const isStepValid = (step: number): boolean => {
    switch (step) {
      case 0:
        return !!(name.trim() && targetAmount > 0 && maturityDate && inflationRate >= 0);
      case 1:
        return assetAllocations.length > 0 && assetAllocations.every(a => a.assetId > 0);
      case 2:
        return true;
      default:
        return false;
    }
  };

  /** The goal's own currency, not the base one: this form authors one goal. */
  const formatCurrency = (amount: number): string => UIUtils.formatCurrency(amount, currency);

  const renderBasicDetails = () => (
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
          helperText={
            "Give your goal a meaningful name (e.g., 'House Down Payment', 'Child\u2019s Education')"
          }
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          margin="dense"
          label="Target Amount (Today's Value)"
          type="number"
          fullWidth
          variant="outlined"
          value={targetAmount}
          onChange={e => setTargetAmount(Number(e.target.value))}
          required
          helperText="Enter the amount you need in today's purchasing power"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <FormControl fullWidth variant="outlined" margin="dense">
          <InputLabel>Currency</InputLabel>
          <Select
            value={currency}
            onChange={e => setCurrency(e.target.value as Currency)}
            label="Currency"
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
          margin="dense"
          label="Target Date"
          type="date"
          fullWidth
          variant="outlined"
          value={maturityDate}
          onChange={e => setMaturityDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          required
          helperText="When do you need this money?"
        />
      </Grid>

      <Grid item xs={12} sm={6}>
        <TextField
          margin="dense"
          label="Expected Inflation Rate (%)"
          type="number"
          fullWidth
          variant="outlined"
          value={inflationRate}
          onChange={e => setInflationRate(Number(e.target.value))}
          inputProps={{ step: 0.1, min: 0, max: 20 }}
          required
          helperText="Historical average is ~6% for India"
        />
      </Grid>

      {progressMetrics.yearsToGoal > 0 && (
        <Grid item xs={12}>
          <Card
            variant="outlined"
            sx={{ backgroundColor: 'info.main', color: 'info.contrastText' }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <TrendingUp />
                <Typography variant="h6">Inflation Impact</Typography>
              </Box>
              <Typography variant="body2" sx={{ mb: 1 }}>
                In {progressMetrics.yearsToGoal.toFixed(1)} years, you&apos;ll need{' '}
                <strong>{formatCurrency(progressMetrics.inflatedTargetAmount)}</strong> to have the
                same purchasing power as {formatCurrency(targetAmount)} today.
              </Typography>
              <Typography variant="caption">
                That&apos;s{' '}
                {((progressMetrics.inflatedTargetAmount / targetAmount - 1) * 100).toFixed(1)}% more
                due to inflation!
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );

  const renderAssetAllocation = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">Allocate Your Assets</Typography>
        <Button startIcon={<Add />} onClick={addAssetAllocation} variant="outlined">
          Add Asset
        </Button>
      </Box>

      {progressMetrics.inflatedTargetAmount > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            <strong>Goal:</strong> Allocate specific amounts from your assets to reach{' '}
            <strong>{formatCurrency(progressMetrics.inflatedTargetAmount)}</strong>{' '}
            (inflation-adjusted target). You don&apos;t need to allocate 100% of any asset - just
            enough to meet your goal.
          </Typography>
        </Alert>
      )}

      {assetAllocations.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          Add assets to see how your current portfolio contributes to this goal.
        </Alert>
      )}

      {assetAllocations.map((allocation, index) => {
        const asset = availableAssets.find(a => a.id === allocation.assetId);
        const assetValue = asset
          ? converter.convert(asset.getValue() || 0, asset.currency, currency)
          : 0;
        const allocatedValue = (assetValue * allocation.percentage) / 100;

        return (
          <Card key={index} variant="outlined" sx={{ mb: 2, p: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              <FormControl sx={{ minWidth: 200 }} size="small">
                <InputLabel>Asset</InputLabel>
                <Select
                  value={allocation.assetId}
                  onChange={e => updateAssetAllocation(index, 'assetId', Number(e.target.value))}
                  label="Asset"
                >
                  <MenuItem value={0}>
                    <em>Select an asset</em>
                  </MenuItem>
                  {availableAssets.map(asset => (
                    <MenuItem key={asset.id} value={asset.id}>
                      {asset.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <TextField
                label="Allocation %"
                type="number"
                value={allocation.percentage}
                onChange={e => updateAssetAllocation(index, 'percentage', Number(e.target.value))}
                inputProps={{ min: 0, max: 100, step: 0.1 }}
                sx={{ width: 140 }}
                size="small"
                helperText="% of asset value"
              />

              {asset && (
                <Box sx={{ flex: 1, minWidth: 200 }}>
                  <Typography variant="body2" color="text.secondary">
                    Asset Value: {formatCurrency(assetValue)}
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                    Allocated: {formatCurrency(allocatedValue)}
                  </Typography>
                  {allocation.percentage > 100 && (
                    <Typography variant="caption" color="error.main">
                      ⚠️ Cannot allocate more than 100%
                    </Typography>
                  )}
                </Box>
              )}

              <IconButton onClick={() => removeAssetAllocation(index)} size="small">
                <Delete />
              </IconButton>
            </Box>
          </Card>
        );
      })}

      <Box sx={{ mt: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">Total Allocated Amount</Typography>
          <Typography
            variant="body2"
            color={
              totalAllocatedAmount >= progressMetrics.inflatedTargetAmount
                ? 'success.main'
                : 'primary.main'
            }
            sx={{ fontWeight: 'medium' }}
          >
            {formatCurrency(totalAllocatedAmount)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2">Target Amount (Inflated)</Typography>
          <Typography variant="body2" color="warning.main" sx={{ fontWeight: 'medium' }}>
            {formatCurrency(progressMetrics.inflatedTargetAmount)}
          </Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min((totalAllocatedAmount / progressMetrics.inflatedTargetAmount) * 100, 100)}
          color={
            totalAllocatedAmount >= progressMetrics.inflatedTargetAmount ? 'success' : 'primary'
          }
          sx={{ height: 8, borderRadius: 1 }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {totalAllocatedAmount >= progressMetrics.inflatedTargetAmount
            ? '✅ Goal fully funded!'
            : `Need ${formatCurrency(progressMetrics.inflatedTargetAmount - totalAllocatedAmount)} more`}
        </Typography>
      </Box>
    </Box>
  );

  const renderReview = () => (
    <Box>
      <Typography variant="h6" gutterBottom>
        Goal Summary
      </Typography>

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="h6" color="primary" gutterBottom>
                {name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Target Date: {new Date(maturityDate).toLocaleDateString()}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Years to Goal: {progressMetrics.yearsToGoal.toFixed(1)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6}>
          <Card variant="outlined">
            <CardContent>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Target Amount (Today&apos;s Value)
              </Typography>
              <Typography variant="h6">{formatCurrency(targetAmount)}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Inflation-Adjusted Target
              </Typography>
              <Typography variant="h6" color="warning.main">
                {formatCurrency(progressMetrics.inflatedTargetAmount)}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card variant="outlined" sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <AccountBalance color="primary" />
            <Typography variant="h6">Progress Analysis</Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Current Progress</Typography>
              <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                {progressMetrics.progressPercentage.toFixed(1)}%
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressMetrics.progressPercentage}
              sx={{ height: 8, borderRadius: 1 }}
            />
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Current Allocated Value
              </Typography>
              <Typography variant="h6" color="primary">
                {formatCurrency(progressMetrics.totalAllocatedValue)}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Remaining Needed
              </Typography>
              <Typography variant="h6" color="warning.main">
                {formatCurrency(
                  Math.max(
                    0,
                    progressMetrics.inflatedTargetAmount - progressMetrics.totalAllocatedValue
                  )
                )}
              </Typography>
            </Grid>

            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Suggested Monthly SIP
              </Typography>
              <Typography variant="h6" color="success.main">
                {formatCurrency(progressMetrics.monthlyRequiredSIP)}
              </Typography>
            </Grid>
          </Grid>

          {progressMetrics.progressPercentage >= 100 && (
            <Alert severity="success" sx={{ mt: 2 }}>
              <strong>Congratulations!</strong> Your current allocations exceed your
              inflation-adjusted target!
            </Alert>
          )}

          {progressMetrics.monthlyRequiredSIP > 0 && (
            <Alert severity="info" sx={{ mt: 2 }}>
              <Typography variant="body2">
                <strong>Investment Insight:</strong> You need to invest approximately{' '}
                <strong>{formatCurrency(progressMetrics.monthlyRequiredSIP)}</strong> monthly
                (assuming 12% annual returns) to reach your goal.
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
        Asset Allocation Breakdown
      </Typography>

      {assetAllocations.map((allocation, index) => {
        const asset = availableAssets.find(a => a.id === allocation.assetId);
        if (!asset) return null;

        const assetValue = converter.convert(
          asset.getValueOn(goal!.maturityDate, true) || 0,
          asset.currency,
          currency
        );
        const allocatedValue = (assetValue * allocation.percentage) / 100;

        return (
          <Card key={index} variant="outlined" sx={{ mb: 1 }}>
            <CardContent sx={{ py: 1.5 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {asset.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {allocation.percentage}% of asset value
                  </Typography>
                </Box>
                <Box sx={{ textAlign: 'right' }}>
                  <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                    {formatCurrency(allocatedValue)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    of {formatCurrency(assetValue)}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        );
      })}
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h5">{goal ? 'Edit Goal' : 'Create New Goal'}</Typography>
          {goal && <Chip label="Editing" size="small" color="primary" variant="outlined" />}
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
          {steps.map(label => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {activeStep === 0 && renderBasicDetails()}
        {activeStep === 1 && renderAssetAllocation()}
        {activeStep === 2 && renderReview()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>

        {activeStep > 0 && <Button onClick={handleBack}>Back</Button>}

        {activeStep < steps.length - 1 ? (
          <Button variant="contained" onClick={handleNext} disabled={!isStepValid(activeStep)}>
            Next
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={loading || !isStepValid(activeStep)}
          >
            {loading ? 'Saving...' : 'Save Goal'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
