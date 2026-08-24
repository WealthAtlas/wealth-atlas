import { Logger } from '@/domain/utils/Logger';
import { db } from '../database';
import { getSyncConflict } from './conflict';
import { SyncService } from './Syncer';
import { getAutoSyncEnabled, getKeyId, markPendingChange } from './state';

export class AutoSyncService {
  private static syncTimeout: NodeJS.Timeout | null = null;
  private static isListening = false;
  private static readonly SYNC_DELAY_MS = 2000; // 2 seconds delay to batch changes

  /**
   * Depth of `withoutScheduling` calls. A counter rather than a boolean so nested
   * callers cannot switch scheduling back on for each other.
   */
  private static suppressionDepth = 0;

  private static pollTimer: NodeJS.Timeout | null = null;
  private static pollInFlight = false;
  private static readonly POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  /**
   * Start listening for database changes and auto-sync when enabled
   */
  static startListening(): void {
    if (AutoSyncService.isListening) return;

    AutoSyncService.isListening = true;
    Logger.info('AutoSyncService: Starting to listen for database changes');

    // Listen to all tables for changes
    const tables = [
      db.assets,
      db.investments,
      db.sips,
      db.expenses,
      db.loans,
      db.emis,
      db.payments,
      db.goals,
      db.allocations,
      // Settings and rates are part of the snapshot too, so a base-currency,
      // rate or AI-provider change has to wake a push like any other edit.
      db.settings,
      db.currencyRates,
      // Journal entries are the user's own records like any other, so an edit
      // has to wake a push. A table missing from this list syncs only when
      // something else happens to change.
      db.decisions,
      // Written by the assistant's background curator rather than by a form, and
      // deliberately not wrapped in `withoutScheduling`: what the user told the
      // assistant about themselves is their data like any other, so it should
      // wake a push.
      db.memories,
      // A deletion is a change like any other, and the only record that it
      // happened. Missing from this list, a delete would reach other devices
      // only if something else happened to be edited afterwards — and until then
      // every merge would hand the row back.
      db.deletions,
    ];

    tables.forEach(table => {
      // Listen for create, update, delete operations
      table.hook('creating', () => AutoSyncService.scheduleSync('create', table.name));
      table.hook('updating', () => AutoSyncService.scheduleSync('update', table.name));
      table.hook('deleting', () => AutoSyncService.scheduleSync('delete', table.name));
    });
  }

  /**
   * Stop listening for database changes
   */
  static stopListening(): void {
    if (!AutoSyncService.isListening) return;

    AutoSyncService.isListening = false;
    Logger.info('AutoSyncService: Stopping database change listener');

    // Clear any pending sync
    if (AutoSyncService.syncTimeout) {
      clearTimeout(AutoSyncService.syncTimeout);
      AutoSyncService.syncTimeout = null;
    }

    // Note: Dexie doesn't provide a way to remove hooks,
    // so we rely on the isListening flag to ignore future hook calls
  }

  /**
   * Runs `fn` with change-driven pushes turned off, and drops rather than defers
   * whatever it writes.
   *
   * For writes that are not the user changing their mind about anything: a schema
   * migration, or the one-time adoption of settings that used to live outside
   * Dexie. Pushing those would race the device's own first pull, and whichever
   * won would silently decide which device's settings survived. They reach the
   * cloud with the next real edit instead.
   */
  /**
   * Whether a write happening right now is an automatic one.
   *
   * Read by the sync-metadata hooks: the same flag that says "do not push this"
   * also says "do not date this as the latest change", because both questions
   * are the same question — is this the user changing their mind?
   */
  static isSuppressed(): boolean {
    return AutoSyncService.suppressionDepth > 0;
  }

  static async withoutScheduling<T>(fn: () => Promise<T>): Promise<T> {
    AutoSyncService.suppressionDepth++;
    try {
      return await fn();
    } finally {
      AutoSyncService.suppressionDepth--;
    }
  }

  /**
   * Schedule a sync operation with debouncing to batch multiple changes
   */
  private static scheduleSync(operation: string, tableName: string): void {
    // Only proceed if still listening and auto-sync is configured
    if (!AutoSyncService.isListening) return;
    if (AutoSyncService.suppressionDepth > 0) {
      Logger.log(`AutoSyncService: Not scheduling for ${operation} on ${tableName} - suppressed`);
      return;
    }

    const keyId = getKeyId();
    const autoSyncEnabled = getAutoSyncEnabled();

    if (!keyId) {
      Logger.log(
        `AutoSyncService: Skipping sync for ${operation} on ${tableName} - not configured`
      );
      return;
    }

    // Recorded before the debounce and regardless of whether auto-sync is on:
    // the edit has diverged from the cloud either way, and this mark is what
    // stops a later pull from silently replacing it. Cleared only by a push or
    // an import that completes.
    markPendingChange();

    if (!autoSyncEnabled) {
      Logger.log(`AutoSyncService: Not pushing ${operation} on ${tableName} - auto-sync is off`);
      return;
    }

    // A refused sync is waiting on the user. Retrying on every keystroke would
    // spend a request per batch of edits to reach the same answer, and the mark
    // above already holds the divergence.
    if (getSyncConflict()) {
      Logger.log(`AutoSyncService: Not pushing ${operation} on ${tableName} - conflict unresolved`);
      return;
    }

    Logger.log(`AutoSyncService: Scheduling sync for ${operation} on ${tableName}`);

    // Clear existing timeout to debounce rapid changes
    if (AutoSyncService.syncTimeout) {
      clearTimeout(AutoSyncService.syncTimeout);
    }

    // Schedule new sync
    AutoSyncService.syncTimeout = setTimeout(async () => {
      try {
        Logger.info('AutoSyncService: Performing automatic sync');
        // Reconcile, not push: if another device has changed something in the
        // meantime, this merges the two and publishes the result instead of
        // stopping to ask which copy to keep.
        const result = await SyncService.reconcile();
        Logger.info(`AutoSyncService: Sync completed successfully, version: ${result.version}`);
      } catch (error) {
        // A conflict is recorded by the push itself and shown by the banner, so
        // there is nothing to retry and nothing to raise here.
        Logger.warn('AutoSyncService: Auto-sync failed:', error);
        // Don't throw - auto-sync should be non-intrusive
      } finally {
        AutoSyncService.syncTimeout = null;
      }
    }, AutoSyncService.SYNC_DELAY_MS);
  }

  /**
   * Begin polling the remote for changes made on other devices.
   *
   * A backgrounded tab has nobody reading it, so ticks there are skipped
   * entirely and the catch-up happens when the tab is looked at again. Between
   * that and the interval itself, an idle tab costs nothing instead of billing a
   * request every 30 seconds all day.
   */
  static startPeriodicPull(): void {
    if (AutoSyncService.pollTimer) return;

    AutoSyncService.pollTimer = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      void AutoSyncService.pollNow();
    }, AutoSyncService.POLL_INTERVAL_MS);

    document.addEventListener('visibilitychange', AutoSyncService.handleVisibilityChange);
    window.addEventListener('online', AutoSyncService.handleOnline);
    Logger.info('AutoSyncService: Periodic pull enabled (5 minutes, foreground only)');
  }

  static stopPeriodicPull(): void {
    if (AutoSyncService.pollTimer) {
      clearInterval(AutoSyncService.pollTimer);
      AutoSyncService.pollTimer = null;
    }
    document.removeEventListener('visibilitychange', AutoSyncService.handleVisibilityChange);
    window.removeEventListener('online', AutoSyncService.handleOnline);
    Logger.info('AutoSyncService: Periodic pull disabled');
  }

  private static readonly handleVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') void AutoSyncService.pollNow();
  };

  private static readonly handleOnline = (): void => {
    void AutoSyncService.pollNow();
  };

  /** Pulls unless one is already in flight. Errors are swallowed by autoSync. */
  private static async pollNow(): Promise<void> {
    if (AutoSyncService.pollInFlight) return;
    AutoSyncService.pollInFlight = true;
    try {
      const result = await SyncService.autoSync();
      if (result.version) {
        Logger.info(`AutoSyncService: Pulled version ${result.version}`);
      }
    } finally {
      AutoSyncService.pollInFlight = false;
    }
  }

  /**
   * Force an immediate sync (ignores debouncing)
   */
  static async forceSyncNow(): Promise<{ version: number | null } | null> {
    const keyId = getKeyId();
    const autoSyncEnabled = getAutoSyncEnabled();

    if (!keyId || !autoSyncEnabled) {
      Logger.warn('AutoSyncService: Cannot force sync - not configured');
      return null;
    }

    try {
      Logger.info('AutoSyncService: Forcing immediate sync');

      // Clear any pending sync
      if (AutoSyncService.syncTimeout) {
        clearTimeout(AutoSyncService.syncTimeout);
        AutoSyncService.syncTimeout = null;
      }

      const result = await SyncService.reconcile();
      Logger.info(`AutoSyncService: Force sync completed successfully, version: ${result.version}`);
      return result;
    } catch (error) {
      Logger.error('AutoSyncService: Force sync failed:', error);
      throw error;
    }
  }

  /**
   * Get the current status of auto-sync
   */
  static getStatus(): {
    isListening: boolean;
    hasPendingSync: boolean;
    syncConfigured: boolean;
  } {
    const keyId = getKeyId();
    const autoSyncEnabled = getAutoSyncEnabled();

    return {
      isListening: AutoSyncService.isListening,
      hasPendingSync: AutoSyncService.syncTimeout !== null,
      syncConfigured: Boolean(keyId && autoSyncEnabled),
    };
  }
}
