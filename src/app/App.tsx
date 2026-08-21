import { AutoSyncService } from '@/data/sync/AutoSyncService';
import { SyncService } from '@/data/sync/Syncer';
import { AssetService } from '@/domain/services/AssetService';
import { LoanService } from '@/domain/services/LoanService';
import { Logger } from '@/domain/utils/Logger';
import { useEffect } from 'react';
import { CurrencyProvider } from './components/providers/CurrencyProvider';
import { NotificationProvider } from './components/providers/NotificationProvider';
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
        await loanService.createEMIPayments();

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

    // Registering the change hooks here (rather than only when the setting is
    // toggled) is what makes push-on-change survive a reload.
    AutoSyncService.startListening();
    AutoSyncService.startPeriodicPull();

    // Cleanup on unmount
    return () => {
      AutoSyncService.stopPeriodicPull();
    };
  }, []);

  return (
    <AppThemeProvider>
      <NotificationProvider>
        <CurrencyProvider>
          <AppRouter />
        </CurrencyProvider>
      </NotificationProvider>
    </AppThemeProvider>
  );
}
