import { GoalFormDialog } from '@/app/components/dialogs/GoalFormDialog';
import { Asset } from '@/domain/entities/assets/Asset';
import { Goal, IGoal } from '@/domain/entities/goals/Goal';
import { AssetService } from '@/domain/services/AssetService';
import { GoalService } from '@/domain/services/GoalService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useState } from 'react';

export interface GoalFormContainerProps {
  goalToEdit?: Goal;
  open: boolean;
  onClose: () => void;
}

export function GoalFormContainer({ goalToEdit, open, onClose }: GoalFormContainerProps) {
  const [availableAssets, setAvailableAssets] = useState<Asset[]>([]);
  const goalService = React.useMemo(() => new GoalService(), []);
  const assetService = React.useMemo(() => new AssetService(), []);

  const loadAssets = useCallback(async () => {
    try {
      const assets = await assetService.getAssets();
      setAvailableAssets(assets);
    } catch (error) {
      Logger.error('Failed to load assets:', error);
    }
  }, [assetService]);

  useEffect(() => {
    if (open) {
      loadAssets();
    }
  }, [open, loadAssets]);

  const handleSave = async (
    goalData: IGoal,
    assetAllocations: { assetId: number; percentage: number }[]
  ) => {
    try {
      if (goalToEdit) {
        await goalService.updateGoal(goalToEdit.id!, goalData, assetAllocations);
      } else {
        await goalService.createGoal(goalData, assetAllocations);
      }
    } catch (error) {
      Logger.error('Failed to save goal:', error);
      throw error;
    } finally {
      onClose();
    }
  };

  return (
    <GoalFormDialog
      goal={goalToEdit}
      availableAssets={availableAssets}
      open={open}
      onClose={onClose}
      onSave={handleSave}
    />
  );
}
