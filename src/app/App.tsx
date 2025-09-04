import { SyncService } from '@/data/sync/Syncer';
import { AssetService } from '@/domain/services/AssetService';
import { LoanService } from '@/domain/services/LoanService';
import { Logger } from '@/domain/utils/Logger';
import { useEffect } from 'react';
import { AppRouter } from './router/AppRouter';
import { AppThemeProvider } from './theme/AppThemeProvider';

export default function App() {
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

    initializeApp();
  }, []);

  return (
    <AppThemeProvider>
      <AppRouter />
    </AppThemeProvider>
  );
}
