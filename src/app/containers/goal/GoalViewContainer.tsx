import { GoalView } from '@/app/components/views/GoalView';
import { Goal } from '@/domain/entities/goals/Goal';
import { GoalService } from '@/domain/services/GoalService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useState } from 'react';

export interface GoalViewContainerProps {
  goalId: number;
  deleteGoal: (id: number) => void;
  refresh: () => void;
}

export function GoalViewContainer({ goalId, deleteGoal, refresh }: GoalViewContainerProps) {
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

  // Calculate goal-specific metrics
  const currentValue = goal.allocations.reduce((sum, allocation) => {
    const assetValue = allocation.asset.getValueOn(goal.maturityDate) || 0;
    return sum + (assetValue * allocation.allocationPercentage) / 100;
  }, 0);

  const inflationAdjustedTarget = goal.getInflationAdjustedTarget();
  const progressPercentage =
    inflationAdjustedTarget > 0 ? (currentValue / inflationAdjustedTarget) * 100 : 0;
  const shortfall = Math.max(0, inflationAdjustedTarget - currentValue);

  return (
    <GoalView
      goal={goal}
      currentValue={currentValue}
      inflationAdjustedTarget={inflationAdjustedTarget}
      progressPercentage={progressPercentage}
      shortfall={shortfall}
      showEditGoal={showEditGoal}
      deleteGoal={deleteGoal}
      refresh={refresh}
      setShowEditGoal={setShowEditGoal}
    />
  );
}
