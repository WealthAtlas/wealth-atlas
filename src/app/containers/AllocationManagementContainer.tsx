import {
  AllocationData,
  AllocationManagementDialog,
} from '@/app/components/Dialogs/AllocationManagementDialog';
import { Asset } from '@/domain/entities/assets/Asset';
import { AssetGoalAllocation } from '@/domain/entities/goals/AssetGoalAllocation';
import { Goal, IGoal } from '@/domain/entities/goals/Goal';
import { GoalService } from '@/domain/services/GoalService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

interface AllocationManagementContainerProps {
  open: boolean;
  goal: Goal | null;
  onClose: () => void;
  onSave: () => void; // Callback to refresh parent data
}

export const AllocationManagementContainer: React.FC<AllocationManagementContainerProps> = ({
  open,
  goal,
  onClose,
  onSave,
}) => {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [enrichedGoal, setEnrichedGoal] = useState<Goal | null>(null);

  const goalService = useMemo(() => new GoalService(), []);

  const loadAllocationData = useCallback(async () => {
    if (!goal?.id) return;

    try {
      setIsLoading(true);
      const fetchedGoal = await goalService.getAllGoals();
      const currentGoal = fetchedGoal.find(g => g.id === goal.id) || null;
      setEnrichedGoal(currentGoal);
      setAssets(currentGoal?.assetAllocations.map(a => a.asset) || []);
    } catch (error) {
      Logger.error('Failed to load allocation data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [goal?.id, goalService]);

  // Load data when dialog opens
  useEffect(() => {
    if (open && goal) {
      loadAllocationData();
    }
  }, [open, goal, loadAllocationData]);

  const handleSaveAllocations = async (allocations: AllocationData[]) => {
    if (!goal?.id) {
      Logger.error('Goal ID is undefined. Cannot save allocations.');
      return;
    }

    const goalId = goal.id;
    const goalData: IGoal = {
      id: enrichedGoal!.id,
      name: enrichedGoal!.name,
      targetAmount: enrichedGoal!.targetAmount,
      maturityDate: enrichedGoal!.maturityDate,
      inflationRate: enrichedGoal!.inflationRate,
      currency: enrichedGoal!.currency,
      createdAt: enrichedGoal!.createdAt,
    };

    try {
      setIsLoading(true);

      const updatedAllocations = allocations.map(allocation => {
        return new AssetGoalAllocation({
          id: allocation.existingAllocationId,
          assetId: allocation.assetId,
          goalId: goalId,
          allocationPercentage: allocation.allocationPercentage / 100,
          asset: allocation.
        });
      });

      enrichedGoal!.assetAllocations = updatedAllocations;
      await goalService.updateGoal(goalId, goalData);

      onClose();
      onSave();
    } catch (error) {
      Logger.error('Failed to save allocations:', error);
      alert('Failed to save allocations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AllocationManagementDialog
      open={open}
      goal={enrichedGoal}
      assets={assets}
      existingAllocations={enrichedGoal?.assetAllocations || []}
      assetCurrentValues={{}}
      onClose={onClose}
      onSave={handleSaveAllocations}
      isLoading={isLoading}
    />
  );
};
