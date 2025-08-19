import { GoalFormData, GoalFormDialog } from '@/app/components/Forms/GoalFormDialog';
import { GoalsPage } from '@/app/components/Pages/GoalsPage';
import { AllocationManagementContainer } from '@/app/containers/AllocationManagementContainer';
import { AssetGoalAllocationRepository } from '@/data/repositories/AssetGoalAllocationRepository';
import { AssetRepository } from '@/data/repositories/AssetRepository';
import { AssetTransactionRepository } from '@/data/repositories/AssetTransactionRepository';
import { GoalRepository } from '@/data/repositories/GoalRepository';
import { Goal } from '@/domain/entities/goals/Goal';
import { GoalPlanningService, GoalProgressResult } from '@/domain/services/GoalPlanningService';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

export const GoalsContainer: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [goalProgressResults, setGoalProgressResults] = useState<GoalProgressResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<Goal | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAllocationDialogOpen, setIsAllocationDialogOpen] = useState(false);
  const [goalForAllocation, setGoalForAllocation] = useState<Goal | null>(null);

  // Memoized repository instances to prevent recreation on every render
  const goalRepository = useMemo(() => new GoalRepository(), []);
  const assetGoalAllocationRepository = useMemo(() => new AssetGoalAllocationRepository(), []);
  const assetRepository = useMemo(() => new AssetRepository(), []);
  const assetTransactionRepository = useMemo(() => new AssetTransactionRepository(), []);
  const goalPlanningService = useMemo(() => new GoalPlanningService(), []);

  // Load goals and calculate progress
  const loadGoalsAndProgress = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load all goals
      const allGoals = await goalRepository.findAll();
      setGoals(allGoals);

      // Load data needed for progress calculation
      const [allAssets, allTransactions, allAllocations] = await Promise.all([
        assetRepository.findAll(),
        assetTransactionRepository.findAll(),
        assetGoalAllocationRepository.findAll(),
      ]);

      // Calculate progress for each goal
      const progressResults: GoalProgressResult[] = [];
      for (const goal of allGoals) {
        const goalAllocations = allAllocations.filter(allocation => allocation.goalId === goal.id);

        if (goalAllocations.length > 0) {
          const progress = await goalPlanningService.calculateGoalProgress(
            goal,
            goalAllocations,
            allAssets,
            allTransactions
          );
          progressResults.push(progress);
        }
      }

      setGoalProgressResults(progressResults);
    } catch (error) {
      console.error('Failed to load goals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [
    goalRepository,
    assetGoalAllocationRepository,
    assetRepository,
    assetTransactionRepository,
    goalPlanningService,
  ]);

  // Load goals on component mount
  useEffect(() => {
    loadGoalsAndProgress();
  }, [loadGoalsAndProgress]);

  // Handle creating a new goal
  const handleCreateGoal = () => {
    setGoalToEdit(undefined);
    setIsFormOpen(true);
  };

  // Handle editing an existing goal
  const handleEditGoal = (goal: Goal) => {
    setGoalToEdit(goal);
    setIsFormOpen(true);
  };

  // Handle deleting a goal
  const handleDeleteGoal = async (goal: Goal) => {
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the goal "${goal.name}"? This will also remove all associated asset allocations.`
    );

    if (confirmDelete && goal.id) {
      try {
        // Delete allocations first
        await assetGoalAllocationRepository.deleteByGoalId(goal.id);

        // Delete the goal
        await goalRepository.delete(goal.id);

        // Reload data
        await loadGoalsAndProgress();
      } catch (error) {
        console.error('Failed to delete goal:', error);
        alert('Failed to delete goal. Please try again.');
      }
    }
  };

  // Handle managing allocations
  const handleManageAllocations = (goal: Goal) => {
    setGoalForAllocation(goal);
    setIsAllocationDialogOpen(true);
  };

  // Handle allocation dialog close
  const handleAllocationDialogClose = () => {
    setIsAllocationDialogOpen(false);
    setGoalForAllocation(null);
  };

  // Handle allocation save (refresh data)
  const handleAllocationSave = async () => {
    await loadGoalsAndProgress();
  };

  // Handle form submission
  const handleFormSubmit = async (formData: GoalFormData) => {
    try {
      setIsSubmitting(true);

      // Convert form data to domain entity
      const goalData = {
        name: formData.name.trim(),
        targetAmount: formData.targetAmount,
        maturityDate: new Date(formData.maturityDate),
        inflationRate: formData.inflationRate / 100, // Convert percentage to decimal
        currency: formData.currency,
        createdAt: goalToEdit?.createdAt || new Date(),
      };

      if (goalToEdit) {
        // Update existing goal
        const updatedGoal = new Goal(
          goalData.name,
          goalData.targetAmount,
          goalData.maturityDate,
          goalData.inflationRate,
          goalData.currency,
          goalData.createdAt,
          goalToEdit.id
        );
        await goalRepository.save(updatedGoal);
      } else {
        // Create new goal
        const newGoal = new Goal(
          goalData.name,
          goalData.targetAmount,
          goalData.maturityDate,
          goalData.inflationRate,
          goalData.currency,
          goalData.createdAt
        );
        await goalRepository.save(newGoal);
      }

      // Close form and reload data
      setIsFormOpen(false);
      setGoalToEdit(undefined);
      await loadGoalsAndProgress();
    } catch (error) {
      console.error('Failed to save goal:', error);
      alert('Failed to save goal. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle form close
  const handleFormClose = () => {
    setIsFormOpen(false);
    setGoalToEdit(undefined);
  };

  return (
    <>
      <GoalsPage
        goals={goals}
        goalProgressResults={goalProgressResults}
        isLoading={isLoading}
        onCreateGoal={handleCreateGoal}
        onEditGoal={handleEditGoal}
        onDeleteGoal={handleDeleteGoal}
        onManageAllocations={handleManageAllocations}
      />

      <GoalFormDialog
        open={isFormOpen}
        goalToEdit={goalToEdit}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        isLoading={isSubmitting}
      />

      <AllocationManagementContainer
        open={isAllocationDialogOpen}
        goal={goalForAllocation}
        onClose={handleAllocationDialogClose}
        onSave={handleAllocationSave}
      />
    </>
  );
};
