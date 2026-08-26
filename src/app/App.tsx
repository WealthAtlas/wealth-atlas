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
    const initializeApp = async () => {
      try {
        // Auto-convert scheduled transactions.
        //
        // Suppressed for the same reason a migration is: none of these rows is
        // the user changing their mind. They are derived from the schedules the
        // snapshot already carries, they are regenerated on the next startup if
        // a pull replaces them, and marking them as unpushed work would make
        // every launch look like a conflict against a cloud that had moved on.
        //
        // Only the conversions, which are database work and over in a moment.
        // Suppression is a process-wide flag, so everything it spans is claimed
        // as automatic — a user's edit inside the window included, and such an
        // edit gets neither a new `updatedAt` nor an unpushed mark.
        await AutoSyncService.withoutScheduling(async () => {
          await new AssetService().createSIPInvestments();
          await new LoanService().createEMIPayments();
        });

        // Before the value scripts, not after. Learning what the other devices
        // did is the thing worth doing first: editing a record this device has
        // not caught up on writes the whole stale row forward under a fresh
        // timestamp, and row-level last-write-wins then prefers it. This used to
        // wait on `updateValues()` — one script per asset over the network —
        // leaving the app interactive for seconds while still showing what
        // another device had already changed.
        const syncResult = await SyncService.autoSync();
        if (syncResult.version) {
          Logger.info(`Auto-sync completed, updated to version ${syncResult.version}`);
        }

        // Prices, which say nothing about the other devices, so nothing waits on
        // them. Unawaited on purpose: a slow value script must not delay
        // anything above it.
        void new AssetService()
          .updateValues()
          .catch(error => Logger.warn('Could not refresh the value scripts:', error));
      } catch (error) {
        Logger.error('Failed to initialize app:', error);
      }
    };

    initializeApp();

    // Registering the change hooks here (rather than only when the setting is
    // toggled) is what makes push-on-change survive a reload.
    AutoSyncService.startListening();
    AutoSyncService.startPeriodicPull();

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
