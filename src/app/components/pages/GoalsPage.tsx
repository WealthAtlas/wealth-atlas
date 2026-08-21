import { Currency } from '@/domain/entities/shared/Currency';
import { Goal } from '@/domain/entities/goals/Goal';
import { Add } from '@mui/icons-material';
import { Alert, Box, Button, Fab, Grid, Paper, Typography } from '@mui/material';
import { UIUtils } from '../../utils/UIUtils';
import { GoalFormContainer } from '../../containers/goal/GoalFormContainer';
import { GoalViewContainer } from '../../containers/goal/GoalViewContainer';

export interface GoalsPageProps {
  goals: Goal[];
  showAddGoal: boolean;
  goalMetrics: {
    totalTargetAmount: number;
    totalInflationAdjustedTarget: number;
    totalCurrentValue: number;
    averageYearsToMaturity: number;
    currency: Currency;
    unratedCurrencies: Currency[];
  };
  refresh: () => void;
  deleteGoal: (id: number) => void;
  setShowAddGoal: (show: boolean) => void;
}

export function GoalsPage({
  goals,
  showAddGoal,
  goalMetrics,
  refresh,
  deleteGoal,
  setShowAddGoal,
}: GoalsPageProps) {
  return (
    <>
      <GoalFormContainer
        goalToEdit={undefined}
        onClose={() => {
          setShowAddGoal(false);
          refresh();
        }}
        open={showAddGoal}
      />
      <Box sx={{ p: 3, pb: 10 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              Goals
            </Typography>
            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Total Target
                </Typography>
                <Typography variant="h6">
                  {UIUtils.formatCurrency(goalMetrics.totalTargetAmount, goalMetrics.currency)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Inflation Adjusted
                </Typography>
                <Typography variant="h6">
                  {UIUtils.formatCurrency(
                    goalMetrics.totalInflationAdjustedTarget,
                    goalMetrics.currency
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Current Value
                </Typography>
                <Typography variant="h6">
                  {UIUtils.formatCurrency(goalMetrics.totalCurrentValue, goalMetrics.currency)}
                </Typography>
              </Box>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Avg. Years to Maturity
                </Typography>
                <Typography variant="h6">
                  {goalMetrics.averageYearsToMaturity.toFixed(1)} years
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>

        {goalMetrics.unratedCurrencies.length > 0 && (
          <Alert severity="warning" sx={{ mb: 3 }}>
            Totals exclude goals in {goalMetrics.unratedCurrencies.join(', ')} — no exchange rate
            set. Add one in Settings.
          </Alert>
        )}

        <Grid container spacing={3}>
          {goals.map(goal => (
            <GoalViewContainer
              key={goal.id}
              goalId={goal.id!}
              deleteGoal={deleteGoal}
              refresh={refresh}
            />
          ))}
        </Grid>

        {goals.length === 0 && (
          <Paper elevation={2} sx={{ p: 4, textAlign: 'center', mt: 3 }}>
            <Typography variant="h6" gutterBottom>
              No goals found
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              Start planning your financial future by setting your first goal.
            </Typography>
            <Button variant="contained" startIcon={<Add />} onClick={() => setShowAddGoal(true)}>
              Add Your First Goal
            </Button>
          </Paper>
        )}

        <Fab
          color="primary"
          aria-label="add goal"
          onClick={() => setShowAddGoal(true)}
          sx={{
            position: 'fixed',
            bottom: 80,
            right: 16,
          }}
        >
          <Add />
        </Fab>
      </Box>
    </>
  );
}
