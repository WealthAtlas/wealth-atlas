import { Goal } from '@/domain/entities/goals/Goal';
import { Currency } from '@/domain/entities/shared/Currency';
import { GoalProgressResult } from '@/domain/services/GoalPlanningService';
import {
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  TrendingUp as TrendingUpIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

interface GoalsPageProps {
  goals: Goal[];
  goalProgressResults: GoalProgressResult[];
  isLoading: boolean;
  onCreateGoal: () => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goal: Goal) => void;
  onManageAllocations: (goal: Goal) => void;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({
  goals,
  goalProgressResults,
  isLoading,
  onCreateGoal,
  onEditGoal,
  onDeleteGoal,
  onManageAllocations,
}) => {
  const getProgressColor = (status: string): 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'ON_TRACK':
        return 'success';
      case 'AT_RISK':
        return 'warning';
      case 'UNLIKELY':
        return 'error';
      default:
        return 'error';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ON_TRACK':
        return <CheckCircleIcon color="success" />;
      case 'AT_RISK':
        return <WarningIcon color="warning" />;
      case 'UNLIKELY':
        return <WarningIcon color="error" />;
      default:
        return <WarningIcon color="error" />;
    }
  };

  const formatCurrency = (amount: number, currency: string): string => {
    const currencySymbols: Record<string, string> = {
      [Currency.USD]: '$',
      [Currency.GBP]: '£',
      [Currency.INR]: '₹',
    };
    const symbol = currencySymbols[currency] || currency;
    return `${symbol}${amount.toLocaleString()}`;
  };

  const getGoalProgress = (goalId: number | undefined): GoalProgressResult | undefined => {
    return goalProgressResults.find(result => result.goal.id === goalId);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading goals...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Financial Goals
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateGoal} size="large">
          Create Goal
        </Button>
      </Box>

      {/* Goals List */}
      {goals.length === 0 ? (
        <Card>
          <CardContent>
            <Box textAlign="center" py={4}>
              <TrendingUpIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Goals Yet
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={3}>
                Create your first financial goal to start tracking your progress toward achieving
                your dreams.
              </Typography>
              <Button variant="contained" startIcon={<AddIcon />} onClick={onCreateGoal}>
                Create Your First Goal
              </Button>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={3}>
          {goals.map(goal => {
            const progress = getGoalProgress(goal.id);
            const inflationAdjustedTarget = goal.getInflationAdjustedTarget();
            const yearsToMaturity = goal.getYearsToMaturity();

            return (
              <Grid item xs={12} md={6} lg={4} key={goal.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    position: 'relative',
                  }}
                >
                  <CardContent sx={{ flexGrow: 1 }}>
                    {/* Goal Header */}
                    <Box
                      display="flex"
                      justifyContent="space-between"
                      alignItems="flex-start"
                      mb={2}
                    >
                      <Typography variant="h6" component="h2" gutterBottom>
                        {goal.name}
                      </Typography>
                      <Box display="flex" gap={0.5}>
                        <Tooltip title="Edit Goal">
                          <IconButton size="small" onClick={() => onEditGoal(goal)}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete Goal">
                          <IconButton size="small" onClick={() => onDeleteGoal(goal)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>

                    {/* Goal Status */}
                    <Box display="flex" alignItems="center" gap={1} mb={2}>
                      <Chip
                        label={goal.getStatus()}
                        color={goal.isMatured() ? 'default' : 'primary'}
                        size="small"
                      />
                      {progress && (
                        <Tooltip
                          title={`Achievement: ${progress.achievementPercentage.toFixed(1)}%`}
                        >
                          <Box display="flex" alignItems="center" gap={0.5}>
                            {getStatusIcon(progress.progressStatus)}
                          </Box>
                        </Tooltip>
                      )}
                    </Box>

                    {/* Target Amount */}
                    <Stack spacing={1} mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        Original Target
                      </Typography>
                      <Typography variant="h6">
                        {formatCurrency(goal.targetAmount, goal.currency)}
                      </Typography>

                      <Typography variant="body2" color="text.secondary">
                        Inflation-Adjusted Target ({(goal.inflationRate * 100).toFixed(1)}%
                        inflation)
                      </Typography>
                      <Typography variant="h6" color="warning.main">
                        {formatCurrency(inflationAdjustedTarget, goal.currency)}
                      </Typography>
                    </Stack>

                    {/* Maturity Info */}
                    <Stack spacing={1} mb={2}>
                      <Typography variant="body2" color="text.secondary">
                        Maturity Date
                      </Typography>
                      <Typography variant="body1">
                        {goal.maturityDate.toLocaleDateString()}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {yearsToMaturity > 0
                          ? `${yearsToMaturity.toFixed(1)} years to go`
                          : 'Goal has matured'}
                      </Typography>
                    </Stack>

                    {/* Progress */}
                    {progress && (
                      <Box mb={2}>
                        <Box
                          display="flex"
                          justifyContent="space-between"
                          alignItems="center"
                          mb={1}
                        >
                          <Typography variant="body2" color="text.secondary">
                            Progress
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {progress.achievementPercentage.toFixed(1)}%
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={Math.min(progress.achievementPercentage, 100)}
                          color={getProgressColor(progress.progressStatus)}
                          sx={{ height: 8, borderRadius: 4 }}
                        />
                        <Box mt={1}>
                          <Typography variant="body2" color="text.secondary">
                            Current Value:{' '}
                            {formatCurrency(progress.totalCurrentValue, goal.currency)}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Projected Value:{' '}
                            {formatCurrency(progress.totalProjectedValue, goal.currency)}
                          </Typography>
                          {progress.shortfall > 0 && (
                            <Typography variant="body2" color="error.main">
                              Shortfall: {formatCurrency(progress.shortfall, goal.currency)}
                            </Typography>
                          )}
                          {progress.surplus > 0 && (
                            <Typography variant="body2" color="success.main">
                              Surplus: {formatCurrency(progress.surplus, goal.currency)}
                            </Typography>
                          )}
                        </Box>
                      </Box>
                    )}

                    {/* Asset Allocations */}
                    {progress && progress.assetDetails.length > 0 && (
                      <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Allocated Assets ({progress.assetDetails.length})
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          {progress.assetDetails.slice(0, 3).map(asset => (
                            <Chip
                              key={asset.assetId}
                              label={`${asset.assetName} (${asset.allocationPercentage.toFixed(0)}%)`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                          {progress.assetDetails.length > 3 && (
                            <Chip
                              label={`+${progress.assetDetails.length - 3} more`}
                              size="small"
                              variant="outlined"
                            />
                          )}
                        </Box>
                      </Box>
                    )}

                    {/* No Allocations Message */}
                    {(!progress || progress.assetDetails.length === 0) && (
                      <Box textAlign="center" py={2}>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          No asset allocations yet
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => onManageAllocations(goal)}
                        >
                          Manage Allocations
                        </Button>
                      </Box>
                    )}
                  </CardContent>

                  {/* Action Button */}
                  {progress && progress.assetDetails.length > 0 && (
                    <Box p={2} pt={0}>
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => onManageAllocations(goal)}
                      >
                        Manage Allocations
                      </Button>
                    </Box>
                  )}
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Box>
  );
};
