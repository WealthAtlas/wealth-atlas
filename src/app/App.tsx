import { Logger } from '@/domain/utils/Logger';
import { useEffect } from 'react';
import { AssetTransactionRepository } from '../data/repositories/AssetTransactionRepository';
import { ScheduledAssetTransactionRepository } from '../data/repositories/ScheduledAssetTransactionRepository';
import { SyncService } from '../data/sync/Syncer';
import { InvestmentScheduleService } from '../domain/services/InvestmentScheduleService';
import { AppRouter } from './router/AppRouter';
import { AppThemeProvider } from './theme/AppThemeProvider';

export default function App() {
  useEffect(() => {
    // Auto-convert scheduled transactions and auto-sync on app startup
    const initializeApp = async () => {
      try {
        // Auto-convert scheduled transactions
        const scheduledRepo = new ScheduledAssetTransactionRepository();
        const transactionRepo = new AssetTransactionRepository();
        const investmentService = new InvestmentScheduleService(scheduledRepo, transactionRepo);
        await investmentService.autoConvertScheduledTransactions();

        // Auto-sync if enabled
        const syncResult = await SyncService.autoSync();
        if (syncResult.version) {
          Logger.info(`Auto-sync completed, updated to version ${syncResult.version}`);
        }
      } catch (error) {
        Logger.error('Failed to initialize app:', error);
      }
    };

    initializeApp();
  }, []);

  return (
    <AppThemeProvider>
      <AppRouter />
    </AppThemeProvider>
  );
}
