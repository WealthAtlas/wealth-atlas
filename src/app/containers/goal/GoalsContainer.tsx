import { useCurrency } from '@/app/components/providers/CurrencyContext';
import { GoalsPage } from '@/app/components/pages/GoalsPage';
import { Goal } from '@/domain/entities/goals/Goal';
import { GoalService } from '@/domain/services/GoalService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useState } from 'react';

export function GoalsContainer() {
  const { converter, baseCurrency } = useCurrency();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [showAddGoal, setShowAddGoal] = React.useState(false);
  const goalService = React.useMemo(() => new GoalService(), []);

  const loadGoals = useCallback(async () => {
    try {
      const loadedGoals = await goalService.getAllGoals();
      setGoals(loadedGoals);
    } catch (error) {
      Logger.error('Failed to load goals:', error);
    }
  }, [goalService]);

  const deleteGoal = useCallback(
    async (id: number) => {
      try {
        await goalService.deleteGoal(id);
        await loadGoals();
      } catch (error) {
        Logger.error('Failed to delete goal:', error);
      }
    },
    [goalService, loadGoals]
  );

  // Calculate goal-level metrics
  const goalMetrics = React.useMemo(() => {
    // Targets are authored in each goal's own currency and progress comes from
    // assets in theirs, so both sides convert to the base currency.
    const totalTargetAmount = goals.reduce(
      (sum, goal) => sum + converter.toBase(goal.targetAmount, goal.currency),
      0
    );
    const totalInflationAdjustedTarget = goals.reduce(
      (sum, goal) => sum + converter.toBase(goal.getInflationAdjustedTarget(), goal.currency),
      0
    );

    // For current value, we need to calculate based on asset allocations
    const totalCurrentValue = goals.reduce((sum, goal) => {
      const goalCurrentValue = goal.allocations.reduce((allocSum, allocation) => {
        const assetValue = allocation.asset.getValue() || 0;
        const allocatedValue = (assetValue * allocation.allocationPercentage) / 100;
        return allocSum + converter.toBase(allocatedValue, allocation.asset.currency);
      }, 0);
      return sum + goalCurrentValue;
    }, 0);

    const averageYearsToMaturity =
      goals.length > 0
        ? goals.reduce((sum, goal) => sum + goal.getYearsToMaturity(), 0) / goals.length
        : 0;

    return {
      totalTargetAmount,
      totalInflationAdjustedTarget,
      totalCurrentValue,
      averageYearsToMaturity,
      currency: baseCurrency,
      unratedCurrencies: converter.getUnratedCurrencies([
        ...goals.map(goal => goal.currency),
        ...goals.flatMap(goal => goal.allocations.map(allocation => allocation.asset.currency)),
      ]),
    };
  }, [goals, converter, baseCurrency]);

  useEffect(() => {
    loadGoals();
  }, [loadGoals]);

  return (
    <>
      <GoalsPage
        goals={goals}
        goalMetrics={goalMetrics}
        showAddGoal={showAddGoal}
        refresh={loadGoals}
        deleteGoal={deleteGoal}
        setShowAddGoal={setShowAddGoal}
      />
    </>
  );
}
