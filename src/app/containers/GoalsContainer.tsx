import { GoalFormData, GoalFormDialog } from '@/app/components/Forms/GoalFormDialog';
import { GoalsPage } from '@/app/components/Pages/GoalsPage';
import { Goal } from '@/domain/entities/goals/Goal';
import { GoalService } from '@/domain/services/GoalService';
import { Logger } from '@/domain/utils/Logger';
import React, { useCallback, useEffect, useMemo, useState } from 'react';

export const GoalsContainer: React.FC = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [goalToEdit, setGoalToEdit] = useState<Goal | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Memoized GoalService instance
  const goalService = useMemo(() => new GoalService(), []);

  // Load goals and calculate progress
  const loadGoalsAndProgress = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch enriched goals with progress
      const allGoals = await goalService.getAllGoals();
      setGoals(allGoals);
    } catch (error) {
      Logger.error('Failed to load goals:', error);
    } finally {
      setIsLoading(false);
    }
  }, [goalService]);

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
        await goalService.deleteGoal(goal.id);
        await loadGoalsAndProgress();
      } catch (error) {
        Logger.error('Failed to delete goal:', error);
        alert('Failed to delete goal. Please try again.');
      }
    }
  };

  // Handle form submission
  const handleFormSubmit = async (formData: GoalFormData) => {
    try {
      setIsSubmitting(true);

      const goalData = {
        id: goalToEdit?.id, // Include id for update
        name: formData.name.trim(),
        targetAmount: formData.targetAmount,
        maturityDate: new Date(formData.maturityDate),
        inflationRate: formData.inflationRate / 100, // Convert percentage to decimal
        currency: formData.currency,
        createdAt: goalToEdit?.createdAt || new Date(),
      };

      if (goalToEdit) {
        await goalService.updateGoal(goalToEdit.id!, goalData);
      } else {
        await goalService.createGoal(goalData);
      }

      setIsFormOpen(false);
      setGoalToEdit(undefined);
      await loadGoalsAndProgress();
    } catch (error) {
      Logger.error('Failed to save goal:', error);
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
        isLoading={isLoading}
        onCreateGoal={handleCreateGoal}
        onEditGoal={handleEditGoal}
        onDeleteGoal={handleDeleteGoal}
        onManageAllocations={() => {}}
      />

      <GoalFormDialog
        open={isFormOpen}
        goalToEdit={goalToEdit}
        onClose={handleFormClose}
        onSubmit={handleFormSubmit}
        isLoading={isSubmitting}
      />
    </>
  );
};
