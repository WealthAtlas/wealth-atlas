import { useCurrency } from '@/app/components/providers/CurrencyContext';
import { GoalView } from '@/app/components/views/GoalView';
import { Goal } from '@/domain/entities/goals/Goal';
import { computeGoalProgress, GoalService } from '@/domain/services/GoalService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useState } from 'react';

export interface GoalViewContainerProps {
  goalId: number;
  deleteGoal: (id: number) => void;
  refresh: () => void;
}

export function GoalViewContainer({ goalId, deleteGoal, refresh }: GoalViewContainerProps) {
  const { converter, baseCurrency } = useCurrency();
  const [goal, setGoal] = useState<Goal | null>(null);
  const [showEditGoal, setShowEditGoal] = React.useState(false);
  const goalService = React.useMemo(() => new GoalService(), []);

  const loadGoal = useCallback(async () => {
    try {
      const goals = await goalService.getAllGoals();
      const foundGoal = goals.find(g => g.id === goalId);
      setGoal(foundGoal || null);
    } catch (error) {
      Logger.error('Failed to load goal:', error);
    }
  }, [goalService, goalId]);

  useEffect(() => {
    loadGoal();
  }, [loadGoal]);

  if (!goal) {
    return null;
  }

  const progress = computeGoalProgress(goal, converter);

  return (
    <GoalView
      goal={goal}
      currency={baseCurrency}
      // The card weighs what the allocations should be worth by the maturity
      // date against an inflation-adjusted target — both sides at that date.
      currentValue={progress.projectedValue}
      targetAmount={progress.targetAmount}
      inflationAdjustedTarget={progress.inflationAdjustedTarget}
      progressPercentage={progress.progressPercentage}
      shortfall={progress.shortfall}
      unratedCurrencies={progress.unratedCurrencies}
      showEditGoal={showEditGoal}
      deleteGoal={deleteGoal}
      refresh={() => {
        loadGoal();
        refresh();
      }}
      setShowEditGoal={setShowEditGoal}
    />
  );
}
