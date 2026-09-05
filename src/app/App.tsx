import { AutoSyncService } from '@/data/sync/AutoSyncService';
import { SyncService } from '@/data/sync/Syncer';
import { AssetService } from '@/domain/services/AssetService';
import { LoanService } from '@/domain/services/LoanService';
import { Logger } from '@/domain/utils/Logger';
import { useEffect } from 'react';
import { CurrencyProvider } from './components/providers/CurrencyProvider';
import { NotificationProvider } from './components/providers/NotificationProvider';
import { AppFailureBoundary } from './containers/shell/AppFailureBoundary';
import { AssetValueFailureReporter } from './containers/shell/AssetValueFailureReporter';
import { AppRouter } from './router/AppRouter';
import { AppThemeProvider } from './theme/AppThemeProvider';

export default function App() {
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // The cloud first, before anything on this device writes a row.
        //
        // Every write publishes under a compare-and-swap against the version
        // this device is based on, so a device that starts up stale is a device
        // whose next edit is refused. Worse, the two things that run below both
        // *write*: converting a schedule against a stale database creates rows
        // that the copy in the cloud already has, under ids that copy uses for
        // something else. Learning what the other devices did is therefore the
        // first thing worth doing, not the last.
        const syncResult = await SyncService.autoSync();
        if (syncResult.version) {
          Logger.info(`Auto-sync completed, updated to version ${syncResult.version}`);
        }

        // Auto-convert scheduled transactions, now against the current data.
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
        // edit gets neither a push nor an unpushed mark.
        await AutoSyncService.withoutScheduling(async () => {
          await new AssetService().createSIPInvestments();
          await new LoanService().createEMIPayments();
        });

        // Prices last, and unawaited: they say nothing about the other devices,
        // and a slow value script must not delay anything above it. Which is
        // exactly why `updateValues` announces itself when it lands rather than
        // returning to a caller that is no longer waiting — by then the pages
        // have long since read their copy.
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
          {/* Inside the provider so it can toast, outside the router so a
              failure raised on any route is reported. */}
          <AssetValueFailureReporter />
          <CurrencyProvider>
            <AppRouter />
          </CurrencyProvider>
        </NotificationProvider>
      </AppFailureBoundary>
    </AppThemeProvider>
  );
}
