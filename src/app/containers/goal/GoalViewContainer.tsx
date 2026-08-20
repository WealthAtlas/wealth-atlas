import { useCurrency } from '@/app/components/providers/CurrencyContext';
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

  // Progress is summed across assets that can each be in a different currency,
  // and the target it is measured against is authored in the goal's own — so
  // both sides are converted to the base currency before they are compared.
  const currentValue = goal.allocations.reduce((sum, allocation) => {
    const assetValue = allocation.asset.getValueOn(goal.maturityDate) || 0;
    const allocatedValue = (assetValue * allocation.allocationPercentage) / 100;
    return sum + converter.toBase(allocatedValue, allocation.asset.currency);
  }, 0);

  const targetAmount = converter.toBase(goal.targetAmount, goal.currency);
  const inflationAdjustedTarget = converter.toBase(
    goal.getInflationAdjustedTarget(),
    goal.currency
  );
  const progressPercentage =
    inflationAdjustedTarget > 0 ? (currentValue / inflationAdjustedTarget) * 100 : 0;
  const shortfall = Math.max(0, inflationAdjustedTarget - currentValue);
  const unratedCurrencies = converter.getUnratedCurrencies([
    goal.currency,
    ...goal.allocations.map(allocation => allocation.asset.currency),
  ]);

  return (
    <GoalView
      goal={goal}
      currency={baseCurrency}
      currentValue={currentValue}
      targetAmount={targetAmount}
      inflationAdjustedTarget={inflationAdjustedTarget}
      progressPercentage={progressPercentage}
      shortfall={shortfall}
      unratedCurrencies={unratedCurrencies}
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
