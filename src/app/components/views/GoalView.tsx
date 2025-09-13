import { Goal } from '@/domain/entities/goals/Goal';
import {
  AccessTime,
  AccountBalance,
  CheckCircle,
  Delete,
  Edit,
  Star,
  Timeline,
  TrendingUp,
  Warning,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  Paper,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { useState } from 'react';
import { GoalFormContainer } from '../../containers/goal/GoalFormContainer';
import { UIUtils } from '../../utils/UIUtils';

export interface GoalViewProps {
  goal: Goal;
  currentValue: number;
  inflationAdjustedTarget: number;
  progressPercentage: number;
  shortfall: number;
  showEditGoal: boolean;
  deleteGoal: (id: number) => void;
  refresh: () => void;
  setShowEditGoal: (show: boolean) => void;
}

export function GoalView({
  goal,
  currentValue,
  inflationAdjustedTarget,
  progressPercentage,
  shortfall,
  showEditGoal,
  deleteGoal,
  refresh,
  setShowEditGoal,
}: GoalViewProps) {
  const theme = useTheme();
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  const handleEdit = () => {
    setShowEditGoal(true);
  };

  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  const handleDeleteConfirm = () => {
    deleteGoal(goal.id!);
    setShowDeleteConfirmation(false);
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirmation(false);
  };

  const yearsToMaturity = goal.getYearsToMaturity();
  const isOverdue = yearsToMaturity <= 0;
  const isAchieved = progressPercentage >= 100;
  const isBehind = progressPercentage < 60 && yearsToMaturity < 2 && !isOverdue;
  const isOnTrack = progressPercentage >= 60 && !isAchieved && !isOverdue;

  // Enhanced status configuration
  const getStatusConfig = () => {
    if (isAchieved) {
      return {
        status: 'Achieved',
        color: 'success.main',
        bgColor: alpha(theme.palette.success.main, 0.1),
        icon: <CheckCircle sx={{ color: theme.palette.success.main }} />,
        priority: 'success',
      };
    }
    if (isOverdue) {
      return {
        status: 'Overdue',
        color: 'error.main',
        bgColor: alpha(theme.palette.error.main, 0.1),
        icon: <Warning sx={{ color: theme.palette.error.main }} />,
        priority: 'critical',
      };
    }
    if (isBehind) {
      return {
        status: 'Behind Schedule',
        color: 'warning.main',
        bgColor: alpha(theme.palette.warning.main, 0.1),
        icon: <Warning sx={{ color: theme.palette.warning.main }} />,
        priority: 'high',
      };
    }
    if (isOnTrack) {
      return {
        status: 'On Track',
        color: 'primary.main',
        bgColor: alpha(theme.palette.primary.main, 0.1),
        icon: <TrendingUp sx={{ color: theme.palette.primary.main }} />,
        priority: 'normal',
      };
    }
    return {
      status: 'In Progress',
      color: 'grey.600',
      bgColor: alpha(theme.palette.grey[600], 0.1),
      icon: <Timeline sx={{ color: theme.palette.grey[600] }} />,
      priority: 'normal',
    };
  };

  const statusConfig = getStatusConfig();
  const circularProgress = Math.min(progressPercentage, 100);

  // Time-based urgency indicators
  const getTimeUrgency = () => {
    if (isOverdue) return 'critical';
    if (yearsToMaturity < 1) return 'high';
    if (yearsToMaturity < 3) return 'medium';
    return 'low';
  };

  const timeUrgency = getTimeUrgency();

  const getTimeUrgencyColor = () => {
    switch (timeUrgency) {
      case 'critical':
        return 'error.main';
      case 'high':
        return 'warning.main';
      case 'medium':
        return 'info.main';
      default:
        return 'text.secondary';
    }
  };

  const getPaletteColor = (colorPath: string) => {
    const [colorName] = colorPath.split('.');
    switch (colorName) {
      case 'success':
        return theme.palette.success.main;
      case 'error':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'primary':
        return theme.palette.primary.main;
      case 'grey':
        return theme.palette.grey[600];
      default:
        return theme.palette.primary.main;
    }
  };

  return (
    <>
      <GoalFormContainer
        goalToEdit={goal}
        onClose={() => {
          setShowEditGoal(false);
          refresh();
        }}
        open={showEditGoal}
      />
      <Grid item xs={12} sm={6} md={4}>
        <Card
          elevation={3}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            borderRadius: 3,
            transition: 'all 0.3s ease-in-out',
            overflow: 'hidden',
            '&:hover': {
              elevation: 8,
              transform: 'translateY(-4px)',
              borderColor: statusConfig.color,
              boxShadow: `0 12px 32px ${alpha(getPaletteColor(statusConfig.color), 0.25)}`,
            },
          }}
        >
          {/* Status Header Band */}
          <Box
            sx={{
              bgcolor: statusConfig.color,
              color: 'white',
              py: 1,
              px: 2,
              display: 'flex',
              boxShadow: `0 12px 32px ${alpha(getPaletteColor(statusConfig.color), 0.25)}`,
              alignItems: 'center',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {statusConfig.icon}
              <Typography variant="body2" fontWeight={600}>
                {statusConfig.status}
              </Typography>
            </Box>
            {statusConfig.priority === 'critical' && (
              <Chip
                label="URGENT"
                size="small"
                sx={{
                  bgcolor: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: '0.7rem',
                }}
              />
            )}
          </Box>

          <CardContent sx={{ flexGrow: 1, p: { xs: 2, md: 3 } }}>
            {/* Goal Header */}
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="h6"
                component="h2"
                sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}
              >
                {goal.name}
              </Typography>

              {/* Time to maturity with urgency indicator */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AccessTime sx={{ fontSize: 16, color: getTimeUrgencyColor() }} />
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 500,
                    color: getTimeUrgencyColor(),
                  }}
                >
                  {isOverdue
                    ? `${Math.abs(yearsToMaturity).toFixed(1)} years overdue`
                    : `${yearsToMaturity.toFixed(1)} years remaining`}
                </Typography>
              </Box>
            </Box>

            {/* Progress Visualization */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
              <Box sx={{ position: 'relative' }}>
                <CircularProgress
                  variant="determinate"
                  value={circularProgress}
                  size={80}
                  thickness={6}
                  sx={{
                    color: statusConfig.color,
                    '& .MuiCircularProgress-circle': {
                      strokeLinecap: 'round',
                    },
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    bottom: 0,
                    right: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Typography
                    variant="caption"
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      color: statusConfig.color,
                    }}
                  >
                    {Math.round(progressPercentage)}%
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Current Progress
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
                  {UIUtils.formatCurrency(currentValue, goal.currency)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  of {UIUtils.formatCurrency(inflationAdjustedTarget, goal.currency)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Financial Details */}
            <Stack spacing={2}>
              {/* Original Target vs Inflation Adjusted */}
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Original Target
                </Typography>
                <Box
                  sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                >
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {UIUtils.formatCurrency(goal.targetAmount, goal.currency)}
                  </Typography>
                  <Chip
                    label={`${UIUtils.formatPercentage(goal.inflationRate * 100)} inflation`}
                    size="small"
                    variant="outlined"
                    color="info"
                    sx={{ height: 20, fontSize: '0.7rem' }}
                  />
                </Box>
              </Box>

              {/* Shortfall Alert */}
              {shortfall > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    backgroundColor: alpha(theme.palette.error.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.error.main, 0.3)}`,
                    borderRadius: 2,
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Warning sx={{ fontSize: 18, color: 'error.main' }} />
                    <Typography variant="body2" color="error.main" sx={{ fontWeight: 600 }}>
                      Funding Gap
                    </Typography>
                  </Box>
                  <Typography variant="h6" color="error.main" sx={{ fontWeight: 700 }}>
                    {UIUtils.formatCurrency(shortfall, goal.currency)}
                  </Typography>
                  <Typography variant="caption" color="error.main">
                    Additional funding needed to achieve goal
                  </Typography>
                </Paper>
              )}

              {/* Asset Allocations Summary */}
              {goal.allocations.length > 0 && (
                <Box>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                    sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                  >
                    <AccountBalance sx={{ fontSize: 16 }} />
                    Asset Allocations ({goal.allocations.length})
                  </Typography>
                  <Stack spacing={1.5}>
                    {goal.allocations.slice(0, 3).map(allocation => (
                      <Box key={allocation.id}>
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            mb: 0.5,
                          }}
                        >
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {allocation.asset.name}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ fontWeight: 600 }}
                          >
                            {UIUtils.formatPercentage(allocation.allocationPercentage)}
                          </Typography>
                        </Box>
                        <LinearProgress
                          variant="determinate"
                          value={allocation.allocationPercentage}
                          sx={{
                            height: 6,
                            borderRadius: 3,
                          }}
                        />
                      </Box>
                    ))}
                    {goal.allocations.length > 3 && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ textAlign: 'center', mt: 1 }}
                      >
                        +{goal.allocations.length - 3} more allocations
                      </Typography>
                    )}
                  </Stack>
                </Box>
              )}

              {/* Achievement Indicator */}
              {isAchieved && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                    borderRadius: 2,
                    textAlign: 'center',
                  }}
                >
                  <Star sx={{ fontSize: 24, color: 'success.main', mb: 1 }} />
                  <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                    🎉 Goal Achieved!
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    Congratulations on reaching your financial target
                  </Typography>
                </Paper>
              )}
            </Stack>
          </CardContent>

          <CardActions sx={{ px: 3, pb: 2, pt: 0 }}>
            <IconButton
              size="small"
              onClick={handleEdit}
              aria-label="edit goal"
              sx={{
                color: theme.palette.primary.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              <Edit />
            </IconButton>
            <IconButton
              size="small"
              onClick={handleDelete}
              aria-label="delete goal"
              sx={{
                color: theme.palette.error.main,
                '&:hover': {
                  backgroundColor: alpha(theme.palette.error.main, 0.1),
                },
              }}
            >
              <Delete />
            </IconButton>
          </CardActions>
        </Card>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteConfirmation}
        onClose={handleDeleteCancel}
        aria-labelledby="delete-goal-dialog-title"
        aria-describedby="delete-goal-dialog-description"
      >
        <DialogTitle id="delete-goal-dialog-title">Delete Goal</DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-goal-dialog-description">
            Are you sure you want to delete "{goal.name}"? This action cannot be undone and will
            also delete all associated asset allocations and progress tracking.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteCancel} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained" autoFocus>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
