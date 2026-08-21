import { useCurrency } from '@/app/components/providers/CurrencyContext';
import { GoalsPage } from '@/app/components/pages/GoalsPage';
import { Goal } from '@/domain/entities/goals/Goal';
import { computeGoalPortfolioTotals, GoalService } from '@/domain/services/GoalService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useState } from 'react';

export function GoalsContainer() {
  const { converter } = useCurrency();
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

  const goalMetrics = React.useMemo(
    () => computeGoalPortfolioTotals(goals, converter),
    [goals, converter]
  );

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
