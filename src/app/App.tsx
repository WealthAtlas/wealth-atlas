import { SyncService } from '@/data/sync/Syncer';
import { AssetService } from '@/domain/services/AssetService';
import { LoanService } from '@/domain/services/LoanService';
import { Logger } from '@/domain/utils/Logger';
import { useEffect, useRef } from 'react';
import { AppRouter } from './router/AppRouter';
import { AppThemeProvider } from './theme/AppThemeProvider';

export default function App() {
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Auto-convert scheduled transactions and auto-sync on app startup
    const initializeApp = async () => {
      try {
        // Auto-convert scheduled transactions
        const investmentService = new AssetService();
        await investmentService.createSIPInvestments();
        await investmentService.updateValues();

        const loanService = new LoanService();
        await loanService.createScheduledLoanPayments();

        // Auto-sync if enabled
        const syncResult = await SyncService.autoSync();
        if (syncResult.version) {
          Logger.info(`Auto-sync completed, updated to version ${syncResult.version}`);
        }
      } catch (error) {
        Logger.error('Failed to initialize app:', error);
      }
    };

    // Setup periodic sync every 5 minutes
    const setupPeriodicSync = () => {
      const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

      syncIntervalRef.current = setInterval(async () => {
        try {
          Logger.info('Performing periodic sync...');
          const syncResult = await SyncService.autoSync();
          if (syncResult.version) {
            Logger.info(`Periodic sync completed, updated to version ${syncResult.version}`);
          } else {
            Logger.log('Periodic sync completed, no updates');
          }
        } catch (error) {
          Logger.warn('Periodic sync failed:', error);
          // Don't throw - periodic sync should be non-intrusive
        }
      }, SYNC_INTERVAL_MS);

      Logger.info('Periodic sync enabled - syncing every 5 minutes');
    };

    initializeApp();
    setupPeriodicSync();

    // Cleanup on unmount
    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
        syncIntervalRef.current = null;
        Logger.info('Periodic sync disabled');
      }
    };
  }, []);

  return (
    <AppThemeProvider>
      <AppRouter />
    </AppThemeProvider>
  );
}
