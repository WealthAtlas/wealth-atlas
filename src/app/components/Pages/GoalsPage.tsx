import { Goal } from '@/domain/entities/goals/Goal';
import { Currency } from '@/domain/entities/shared/Currency';
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
  CircularProgress,
  Fab,
  Grid,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import React from 'react';

interface GoalsPageProps {
  goals: Goal[];
  isLoading: boolean;
  onCreateGoal: () => void;
  onEditGoal: (goal: Goal) => void;
  onDeleteGoal: (goal: Goal) => void;
  onManageAllocations: (goal: Goal) => void;
}

export const GoalsPage: React.FC<GoalsPageProps> = ({
  goals,
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

  if (isLoading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: 'calc(100vh - 200px)',
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, pb: 10 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Goals
        </Typography>
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
                    <Box display="flex" alignItems="center" gap={1} mb={2}></Box>

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
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add goal"
        onClick={onCreateGoal}
        sx={{ position: 'fixed', bottom: 80, right: 16 }}
      >
        <AddIcon />
      </Fab>
    </Box>
  );
};
