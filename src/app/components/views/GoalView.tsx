import { Goal } from '@/domain/entities/goals/Goal';
import { Delete, Edit, Flag } from '@mui/icons-material';
import {
  Box,
  Card,
  CardActions,
  CardContent,
  Chip,
  Grid,
  IconButton,
  LinearProgress,
  Typography,
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
          elevation={2}
          sx={{
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            border: isOverdue ? '2px solid' : 'none',
            borderColor: isOverdue ? 'error.main' : 'transparent',
          }}
        >
          <CardContent sx={{ flexGrow: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Flag sx={{ mr: 1, color: 'primary.main' }} />
              <Typography variant="h6" component="h2" noWrap>
                {goal.name}
              </Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Target: {UIUtils.formatCurrency(goal.targetAmount, goal.currency)}
            </Typography>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Progress
              </Typography>
              <LinearProgress
                variant="determinate"
                value={Math.min(progressPercentage, 100)}
                sx={{ mb: 1 }}
                color={progressPercentage >= 100 ? 'success' : 'primary'}
              />
              <Typography variant="body2">
                {UIUtils.formatCurrency(currentValue, goal.currency)} of{' '}
                {UIUtils.formatCurrency(inflationAdjustedTarget, goal.currency)} (
                {UIUtils.formatPercentage(progressPercentage)})
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
              <Chip
                label={`${yearsToMaturity.toFixed(1)} years ${isOverdue ? 'overdue' : 'to go'}`}
                size="small"
                color={isOverdue ? 'error' : 'default'}
              />
              <Chip
                label={`${UIUtils.formatPercentage(goal.inflationRate * 100)} inflation`}
                size="small"
                variant="outlined"
              />
            </Box>

            {shortfall > 0 && (
              <Typography variant="body2" color="warning.main">
                Shortfall: {UIUtils.formatCurrency(shortfall, goal.currency)}
              </Typography>
            )}

            {goal.allocations.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Asset Allocations:
                </Typography>
                {goal.allocations.map(allocation => (
                  <Typography key={allocation.id} variant="caption" display="block">
                    {allocation.asset.name}:{' '}
                    {UIUtils.formatPercentage(allocation.allocationPercentage)}
                  </Typography>
                ))}
              </Box>
            )}
          </CardContent>

          <CardActions>
            <IconButton size="small" onClick={handleEdit} aria-label="edit goal">
              <Edit />
            </IconButton>
            <IconButton size="small" onClick={handleDelete} aria-label="delete goal">
              <Delete />
            </IconButton>
          </CardActions>
        </Card>
      </Grid>
    </>
  );
}
