import { Goal } from '@/domain/entities/goals/Goal';
import {
  CheckCircle,
  Delete,
  Edit,
  Flag,
  Schedule,
  Timeline,
  TrendingUp,
  Warning,
} from '@mui/icons-material';
import {
  Box,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
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

  const handleEdit = () => {
    setShowEditGoal(true);
  };

  const handleDelete = () => {
    if (window.confirm(`Are you sure you want to delete "${goal.name}"?`)) {
      deleteGoal(goal.id!);
    }
  };

  const yearsToMaturity = goal.getYearsToMaturity();
  const isOverdue = yearsToMaturity <= 0;
  const isAchieved = progressPercentage >= 100;
  const isBehind = progressPercentage < 80 && !isOverdue;

  // Determine status and colors
  const getStatusConfig = () => {
    if (isAchieved) {
      return {
        status: 'Achieved',
        color: theme.palette.success.main,
        bgColor: alpha(theme.palette.success.main, 0.1),
        icon: <CheckCircle sx={{ color: theme.palette.success.main }} />,
      };
    }
    if (isOverdue) {
      return {
        status: 'Overdue',
        color: theme.palette.error.main,
        bgColor: alpha(theme.palette.error.main, 0.1),
        icon: <Warning sx={{ color: theme.palette.error.main }} />,
      };
    }
    if (isBehind) {
      return {
        status: 'Behind',
        color: theme.palette.warning.main,
        bgColor: alpha(theme.palette.warning.main, 0.1),
        icon: <TrendingUp sx={{ color: theme.palette.warning.main }} />,
      };
    }
    return {
      status: 'On Track',
      color: theme.palette.primary.main,
      bgColor: alpha(theme.palette.primary.main, 0.1),
      icon: <Timeline sx={{ color: theme.palette.primary.main }} />,
    };
  };

  const statusConfig = getStatusConfig();
  const circularProgress = Math.min(progressPercentage, 100);

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
            borderRadius: 2,
            border: `1px solid ${alpha(statusConfig.color, 0.3)}`,
            transition: 'all 0.3s ease-in-out',
            '&:hover': {
              elevation: 6,
              transform: 'translateY(-2px)',
            },
          }}
        >
          <CardContent sx={{ flexGrow: 1, p: 3 }}>
            {/* Header Section */}
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 3 }}>
              <Box
                sx={{
                  p: 1,
                  borderRadius: '50%',
                  backgroundColor: statusConfig.bgColor,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Flag sx={{ color: statusConfig.color }} />
              </Box>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="h6" component="h2" noWrap sx={{ fontWeight: 600, mb: 0.5 }}>
                  {goal.name}
                </Typography>
                <Chip
                  icon={statusConfig.icon}
                  label={statusConfig.status}
                  size="small"
                  sx={{
                    backgroundColor: statusConfig.bgColor,
                    color: statusConfig.color,
                    fontWeight: 500,
                  }}
                />
              </Box>
            </Stack>

            {/* Progress Section */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
              <Box sx={{ position: 'relative', mr: 3 }}>
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
                  <Typography variant="caption" sx={{ fontWeight: 600, fontSize: '0.75rem' }}>
                    {UIUtils.formatPercentage(progressPercentage)}
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Progress towards goal
                </Typography>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {UIUtils.formatCurrency(currentValue, goal.currency)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  of {UIUtils.formatCurrency(inflationAdjustedTarget, goal.currency)}
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ mb: 2 }} />

            {/* Key Metrics */}
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <Schedule sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                  Time Remaining
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {isOverdue
                    ? `${Math.abs(yearsToMaturity).toFixed(1)} years overdue`
                    : `${yearsToMaturity.toFixed(1)} years to go`}
                </Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Original Target
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 500 }}>
                  {UIUtils.formatCurrency(goal.targetAmount, goal.currency)}
                  <Chip
                    label={`${UIUtils.formatPercentage(goal.inflationRate * 100)} inflation`}
                    size="small"
                    variant="outlined"
                    sx={{ ml: 1, height: 20 }}
                  />
                </Typography>
              </Box>

              {shortfall > 0 && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    backgroundColor: alpha(theme.palette.warning.main, 0.1),
                    border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                    borderRadius: 1,
                  }}
                >
                  <Typography variant="body2" color="warning.main" sx={{ fontWeight: 500 }}>
                    <Warning sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                    Shortfall: {UIUtils.formatCurrency(shortfall, goal.currency)}
                  </Typography>
                </Paper>
              )}
            </Stack>

            {/* Asset Allocations */}
            {goal.allocations.length > 0 && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Asset Allocations
                </Typography>
                <Stack spacing={1}>
                  {goal.allocations.map(allocation => (
                    <Box key={allocation.id}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 0.5 }}
                      >
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {allocation.asset.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {UIUtils.formatPercentage(allocation.allocationPercentage)}
                        </Typography>
                      </Stack>
                      <LinearProgress
                        variant="determinate"
                        value={allocation.allocationPercentage}
                        sx={{
                          height: 6,
                          borderRadius: 3,
                          backgroundColor: alpha(theme.palette.primary.main, 0.1),
                          '& .MuiLinearProgress-bar': {
                            borderRadius: 3,
                          },
                        }}
                      />
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}
          </CardContent>

          <CardActions sx={{ px: 3, pb: 2 }}>
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
    </>
  );
}
