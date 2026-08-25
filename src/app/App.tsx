import { AutoSyncService } from '@/data/sync/AutoSyncService';
import { SyncService } from '@/data/sync/Syncer';
import { AssetService } from '@/domain/services/AssetService';
import { LoanService } from '@/domain/services/LoanService';
import { Logger } from '@/domain/utils/Logger';
import { useEffect } from 'react';
import { CurrencyProvider } from './components/providers/CurrencyProvider';
import { NotificationProvider } from './components/providers/NotificationProvider';
import { AppFailureBoundary } from './containers/shell/AppFailureBoundary';
import { AppRouter } from './router/AppRouter';
import { AppThemeProvider } from './theme/AppThemeProvider';

export default function App() {
  useEffect(() => {
    // Auto-convert scheduled transactions and auto-sync on app startup
    const initializeApp = async () => {
      try {
        // Auto-convert scheduled transactions.
        //
        // Suppressed for the same reason a migration is: none of these rows is
        // the user changing their mind. They are derived from the schedules the
        // snapshot already carries, they are regenerated on the next startup if
        // a pull replaces them, and marking them as unpushed work would make
        // every launch look like a conflict against a cloud that had moved on.
        // They reach the cloud with the next real edit.
        //
        // Only the conversions, which are database work and over in a moment.
        // Suppression is a process-wide flag, so everything it spans is claimed
        // as automatic — an edit the user makes inside the window included, and
        // such an edit gets no new `updatedAt` and no unpushed mark, so the next
        // merge overwrites it without trace. `updateValues()` runs one value
        // script per asset over the network and used to sit in here, holding the
        // flag up for as long as that took; it now suppresses each of its own
        // writes instead.
        const investmentService = new AssetService();
        const loanService = new LoanService();
        await AutoSyncService.withoutScheduling(async () => {
          await investmentService.createSIPInvestments();
          await loanService.createEMIPayments();
        });
        await investmentService.updateValues();

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
      {/* Inside the theme so the failure screen is styled, and outside everything
          else so a provider that throws is caught rather than blanking the app. */}
      <AppFailureBoundary>
        <NotificationProvider>
          <CurrencyProvider>
            <AppRouter />
          </CurrencyProvider>
        </NotificationProvider>
      </AppFailureBoundary>
    </AppThemeProvider>
  );
}
