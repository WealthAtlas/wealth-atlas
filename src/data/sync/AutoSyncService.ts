import { Logger } from '@/domain/utils/Logger';
import { db } from '../database';
import { SyncService } from './Syncer';
import { getAutoSyncEnabled, getKeyId } from './state';

export class AutoSyncService {
  private static syncTimeout: NodeJS.Timeout | null = null;
  private static isListening = false;
  private static readonly SYNC_DELAY_MS = 2000; // 2 seconds delay to batch changes

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
      db.assetTransactions,
      db.sips,
      db.expenses,
      db.loans,
      db.emis,
      db.payments,
      db.goals,
      db.allocations,
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
   * Schedule a sync operation with debouncing to batch multiple changes
   */
  private static scheduleSync(operation: string, tableName: string): void {
    // Only proceed if still listening and auto-sync is configured
    if (!AutoSyncService.isListening) return;

    const keyId = getKeyId();
    const autoSyncEnabled = getAutoSyncEnabled();

    if (!keyId || !autoSyncEnabled) {
      Logger.log(
        `AutoSyncService: Skipping sync for ${operation} on ${tableName} - not configured`
      );
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
        const result = await SyncService.push();
        Logger.info(`AutoSyncService: Sync completed successfully, version: ${result.version}`);
      } catch (error) {
        Logger.warn('AutoSyncService: Auto-sync failed:', error);
        // Don't throw - auto-sync should be non-intrusive
      } finally {
        AutoSyncService.syncTimeout = null;
      }
    }, AutoSyncService.SYNC_DELAY_MS);
  }

  /**
   * Force an immediate sync (ignores debouncing)
   */
  static async forceSyncNow(): Promise<{ version: number } | null> {
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

      const result = await SyncService.push();
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
