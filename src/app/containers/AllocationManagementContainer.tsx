import {
  AllocationData,
  AllocationManagementDialog,
} from '@/app/components/Dialogs/AllocationManagementDialog';
import { AssetGoalAllocationRepository } from '@/data/repositories/AssetGoalAllocationRepository';
import { AssetRepository } from '@/data/repositories/AssetRepository';
import { AssetTransactionRepository } from '@/data/repositories/AssetTransactionRepository';
import { Asset } from '@/domain/entities/assets/Asset';
import { AssetGoalAllocation } from '@/domain/entities/goals/AssetGoalAllocation';
import { Goal } from '@/domain/entities/goals/Goal';
import { PortfolioService } from '@/domain/services/PortfolioService';
import React, { useEffect, useMemo, useState } from 'react';

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
  const [existingAllocations, setExistingAllocations] = useState<AssetGoalAllocation[]>([]);
  const [assetCurrentValues, setAssetCurrentValues] = useState<Record<number, number>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Memoized repository instances
  const assetRepository = useMemo(() => new AssetRepository(), []);
  const assetTransactionRepository = useMemo(() => new AssetTransactionRepository(), []);
  const assetGoalAllocationRepository = useMemo(() => new AssetGoalAllocationRepository(), []);
  const portfolioService = useMemo(() => new PortfolioService(), []);

  // Load data when dialog opens
  useEffect(() => {
    if (open && goal) {
      loadAllocationData();
    }
  }, [open, goal]);

  const loadAllocationData = async () => {
    if (!goal?.id) return;

    try {
      setIsLoading(true);

      // Load all assets and transactions
      const [allAssets, allTransactions, goalAllocations] = await Promise.all([
        assetRepository.findAll(),
        assetTransactionRepository.findAll(),
        assetGoalAllocationRepository.findByGoalId(goal.id),
      ]);

      setAssets(allAssets);
      setExistingAllocations(goalAllocations);

      // Calculate current values for all assets
      const currentValues: Record<number, number> = {};
      allAssets.forEach(asset => {
        const assetTransactions = allTransactions.filter(t => t.assetId === asset.id);
        const assetSummary = portfolioService.getAssetSummary(asset, assetTransactions);
        currentValues[asset.id!] = assetSummary.currentValue || 0;
      });

      setAssetCurrentValues(currentValues);
    } catch (error) {
      console.error('Failed to load allocation data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveAllocations = async (allocations: AllocationData[]) => {
    if (!goal?.id) return;

    try {
      setIsLoading(true);

      // Delete existing allocations that are not in the new list
      const existingIds = existingAllocations.map(a => a.id).filter(Boolean) as number[];
      const newAllocationIds = allocations
        .map(a => a.existingAllocationId)
        .filter(Boolean) as number[];

      const idsToDelete = existingIds.filter(id => !newAllocationIds.includes(id));

      for (const idToDelete of idsToDelete) {
        await assetGoalAllocationRepository.delete(idToDelete);
      }

      // Save or update allocations
      for (const allocation of allocations) {
        if (allocation.existingAllocationId) {
          // Update existing allocation
          const existingAllocation = existingAllocations.find(
            a => a.id === allocation.existingAllocationId
          );

          if (existingAllocation) {
            const updatedAllocation = new AssetGoalAllocation(
              allocation.assetId,
              allocation.goalId,
              allocation.allocationPercentage / 100, // Convert to decimal
              existingAllocation.createdAt,
              existingAllocation.id
            );
            await assetGoalAllocationRepository.save(updatedAllocation);
          }
        } else {
          // Create new allocation
          const newAllocation = AssetGoalAllocation.fromPercentageInput(
            allocation.assetId,
            allocation.goalId,
            allocation.allocationPercentage
          );
          await assetGoalAllocationRepository.save(newAllocation);
        }
      }

      // Close dialog and refresh parent data
      onClose();
      onSave();
    } catch (error) {
      console.error('Failed to save allocations:', error);
      alert('Failed to save allocations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AllocationManagementDialog
      open={open}
      goal={goal}
      assets={assets}
      existingAllocations={existingAllocations}
      assetCurrentValues={assetCurrentValues}
      onClose={onClose}
      onSave={handleSaveAllocations}
      isLoading={isLoading}
    />
  );
};
