import { useState, useEffect } from 'react';
import { DashboardData } from '../../domain/types';
import { db } from '../../data/database';

export const useDashboard = (userId: string | undefined) => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    loadDashboardData();
  }, [userId]);

  const loadDashboardData = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      
      // Get portfolio summary using Dexie
      const portfolioItems = await db.portfolioItems
        .where('userId')
        .equals(userId)
        .toArray();
      
      const totalValue = portfolioItems.reduce((sum, item) => sum + item.value, 0);
      const portfolioCount = portfolioItems.length;

      const data: DashboardData = {
        totalValue,
        monthlyChange: 0, // TODO: Calculate based on historical data
        portfolioItems: portfolioCount,
        lastUpdated: new Date(),
      };

      setDashboardData(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    dashboardData,
    isLoading,
    refresh: loadDashboardData,
  };
};
