import { db as database } from '@/data/database';
import { rehydrateSnapshotDates } from '@/data/rehydrateDates';
import { IMemory } from '@/domain/entities/memory/Memory';
import { emitDatabaseReplaced } from '@/data/databaseEvents';
import { hydrateAiProviderSettings } from '@/data/llm/state';
import { AutoSyncService } from '@/data/sync/AutoSyncService';
import { IAsset } from '@/domain/entities/assets/Asset';
import { IInvestment } from '@/domain/entities/assets/Investment';
import { ISIP } from '@/domain/entities/assets/SIP';
import { IExpense } from '@/domain/entities/expenses/Expense';
import { IAllocation } from '@/domain/entities/goals/Allocation';
import { IGoal } from '@/domain/entities/goals/Goal';
import { IEMI } from '@/domain/entities/loans/EMI';
import { ILoan } from '@/domain/entities/loans/Loan';
import { IPayment } from '@/domain/entities/loans/Payment';
import { IDecisionEntry } from '@/domain/entities/journal/DecisionEntry';
import { ICurrencyRate } from '@/domain/entities/shared/CurrencyRate';
import { ISettings, SETTINGS_ID } from '@/domain/entities/shared/Settings';
import { Logger } from '../utils/Logger';

export interface BackupData {
  version: string;
  timestamp: string;
  data: {
    assets: IAsset[];
    investments: IInvestment[];
    sips: ISIP[];
    expenses: IExpense[];
    loans: ILoan[];
    emis: IEMI[];
    payments: IPayment[];
    goals: IGoal[];
    allocations: IAllocation[];
    /** Added in 2.1.0; absent from older files, which restore with defaults. */
    settings?: ISettings[];
    currencyRates?: ICurrencyRate[];
    /** Added in 2.6.0; absent from older files, which restore an empty journal. */
    decisions?: IDecisionEntry[];
    memories?: IMemory[];
  };
}

export class BackupService {
  /**
   * The version stamped on an exported file.
   *
   * A file older than this one restores exactly as it stands: a field added
   * since reads as absent, which is what the defaults are for, and a field
   * removed since is one nothing reads. Only the other direction is refused —
   * see `upgradeBackupData`.
   *
   * Two fields never travel in it. `settings.ai.apiKey` and `settings.news.apiKey`
   * are stripped on export, because unlike the sync snapshot this file is
   * plaintext on the user's disk, and the key already on the device is carried
   * over on restore.
   */
  private static readonly BACKUP_VERSION = '2.9.0';

  /**
   * Export all data from the database as a JSON string
   */
  static async exportData(): Promise<string> {
    try {
      Logger.info('Starting data export...');

      const [
        assets,
        investments,
        sips,
        expenses,
        loans,
        emis,
        payments,
        goals,
        allocations,
        settings,
        currencyRates,
        decisions,
        memories,
      ] = await Promise.all([
        database.assets.toArray(),
        database.investments.toArray(),
        database.sips.toArray(),
        database.expenses.toArray(),
        database.loans.toArray(),
        database.emis.toArray(),
        database.payments.toArray(),
        database.goals.toArray(),
        database.allocations.toArray(),
        database.settings.toArray(),
        database.currencyRates.toArray(),
        database.decisions.toArray(),
        database.memories.toArray(),
      ]);

      const jsonString = this.toBackupFile({
        assets,
        investments,
        sips,
        expenses,
        loans,
        emis,
        payments,
        goals,
        allocations,
        settings,
        currencyRates,
        decisions,
        memories,
      });
      Logger.info('Data export completed successfully');
      return jsonString;
    } catch (error) {
      Logger.error('Error exporting data:', error);
      throw new Error(
        `Failed to export data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Import data from a JSON string, clearing existing data first
   */
  static async importData(jsonString: string): Promise<void> {
    try {
      Logger.info('Starting data import...');

      // Parse and validate the JSON
      const backupData = this.validateBackupData(jsonString);

      // Refuse a file from a newer build, then turn the ISO date strings JSON
      // gave us back into real Dates before they hit IndexedDB.
      this.upgradeBackupData(backupData);

      // The file carries no API key, so the one on this device is the only one
      // there is. Decided before the wipe, while it can still be read.
      await this.carryOverApiKey(backupData);
      await this.carryOverNewsApiKey(backupData);

      // Suppressed so the restore does not arm a push per row: a whole database
      // arriving one `bulkAdd` at a time would otherwise fire the debounced push
      // repeatedly while the store is still half-written. The restored rows
      // reach the cloud on the user's next edit.
      await AutoSyncService.withoutScheduling(async () => {
        // Clear all existing data
        await this.clearAllData();

        // Import the new data
        await this.importBackupData(backupData);
      });

      // The restored row is read from a synchronous cache; refill it so AI
      // import and the assistant see the endpoint that was just restored.
      await hydrateAiProviderSettings();
      emitDatabaseReplaced();

      Logger.info('Data import completed successfully');
    } catch (error) {
      Logger.error('Error importing data:', error);
      throw new Error(
        `Failed to import data: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Download data as a JSON file
   */
  static async downloadBackup(): Promise<void> {
    try {
      const jsonString = await this.exportData();
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `wealth-atlas-backup-${timestamp}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
      Logger.info(`Backup downloaded as ${filename}`);
    } catch (error) {
      Logger.error('Error downloading backup:', error);
      throw error;
    }
  }

  /**
   * Upload and import data from a file
   */
  static async uploadAndImport(file: File): Promise<void> {
    try {
      Logger.info('Starting file upload and import...');

      if (!file.type.includes('json') && !file.name.endsWith('.json')) {
        throw new Error('Please select a valid JSON file');
      }

      const fileContent = await this.readFileAsText(file);
      await this.importData(fileContent);
    } catch (error) {
      Logger.error('Error uploading and importing data:', error);
      throw error;
    }
  }

  /**
   * Validate the backup data structure
   */
  private static validateBackupData(jsonString: string): BackupData {
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch (error) {
      Logger.error('Invalid JSON format:', error);
      throw new Error('Invalid JSON format');
    }

    if (!parsed || typeof parsed !== 'object') {
      throw new Error('Invalid backup file format');
    }

    const backupData = parsed as Partial<BackupData>;

    if (!backupData.version || !backupData.timestamp || !backupData.data) {
      throw new Error('Missing required backup file fields (version, timestamp, data)');
    }

    const requiredTables = [
      'assets',
      'investments',
      'sips',
      'expenses',
      'loans',
      'emis',
      'payments',
      'goals',
      'allocations',
    ];

    for (const table of requiredTables) {
      if (!Array.isArray(backupData.data[table as keyof BackupData['data']])) {
        throw new Error(`Invalid or missing ${table} data in backup file`);
      }
    }

    return backupData as BackupData;
  }

  /**
   * Refuses a file this build cannot read, then turns the ISO date strings JSON
   * gave us back into real Dates. Mutates `backupData` in place.
   *
   * Only a *newer* file is refused. Reading an older one loses nothing, because
   * this build knows every field in it; reading a newer one would silently drop
   * whatever it has no place for and then write the truncated shape back.
   */
  private static upgradeBackupData(backupData: BackupData): void {
    const majorVersion = Number.parseInt(backupData.version.split('.')[0], 10);

    if (Number.isNaN(majorVersion)) {
      throw new Error(`Unrecognised backup version "${backupData.version}"`);
    }

    if (majorVersion > 2) {
      throw new Error(
        `Backup was created by a newer version of Wealth Atlas (${backupData.version}). ` +
          'Update this device before restoring.'
      );
    }

    rehydrateSnapshotDates(backupData.data as unknown as Record<string, Record<string, unknown>[]>);
  }

  /**
   * The export strips the API key, so a restore would otherwise leave the user
   * with an endpoint and no credential. The key on this device fills the gap —
   * but only when the file points at the same provider. Pairing a key with
   * whatever endpoint the file happens to name would send an OpenRouter key to
   * OpenAI, so a restore that changes provider deliberately asks for a new key.
   */
  private static async carryOverApiKey(backupData: BackupData): Promise<void> {
    const incoming = backupData.data.settings?.find(row => row.id === SETTINGS_ID);
    if (!incoming || incoming.ai?.apiKey) return;

    const current = await database.settings.get(SETTINGS_ID);
    const key = current?.ai?.apiKey;
    if (!key) return;

    const samePreset =
      (incoming.ai?.presetId ?? undefined) === (current?.ai?.presetId ?? undefined);
    const sameBaseUrl = (incoming.ai?.baseUrl ?? undefined) === (current?.ai?.baseUrl ?? undefined);
    if (!samePreset || !sameBaseUrl) {
      Logger.info('Backup names a different AI provider; the stored API key was not carried over');
      return;
    }

    incoming.ai = { ...incoming.ai, apiKey: key };
  }

  /**
   * The news key is carried over unconditionally, unlike the AI one. There is no
   * endpoint to disagree with — the provider and its topic vocabulary are fixed
   * in code — so the only question is whether the file left a gap for the
   * device's key to fill.
   */
  private static async carryOverNewsApiKey(backupData: BackupData): Promise<void> {
    const incoming = backupData.data.settings?.find(row => row.id === SETTINGS_ID);
    if (!incoming || incoming.news?.apiKey) return;

    const key = (await database.settings.get(SETTINGS_ID))?.news?.apiKey;
    if (!key) return;

    incoming.news = { ...incoming.news, apiKey: key };
  }

  /** Writes rows as a restorable backup file, with the API keys stripped out. */
  private static toBackupFile(data: BackupData['data']): string {
    const backupData: BackupData = {
      version: this.BACKUP_VERSION,
      timestamp: new Date().toISOString(),
      data: {
        ...data,
        settings: data.settings?.map(row => this.withoutApiKey(row)),
      },
    };
    return JSON.stringify(backupData, null, 2);
  }

  /** Keys never go into the backup file: it is plaintext on the user's disk. */
  private static withoutApiKey(settings: ISettings): ISettings {
    const ai = { ...(settings.ai ?? {}) };
    delete ai.apiKey;
    const news = { ...(settings.news ?? {}) };
    delete news.apiKey;
    return { ...settings, ai, news };
  }

  /**
   * Clear all data from the database
   */
  private static async clearAllData(): Promise<void> {
    Logger.info('Clearing existing data...');

    await Promise.all([
      database.assets.clear(),
      database.investments.clear(),
      database.sips.clear(),
      database.expenses.clear(),
      database.loans.clear(),
      database.emis.clear(),
      database.payments.clear(),
      database.goals.clear(),
      database.allocations.clear(),
      database.settings.clear(),
      database.currencyRates.clear(),
      database.decisions.clear(),
      database.memories.clear(),
    ]);

    Logger.info('Existing data cleared');
  }

  /**
   * Import validated backup data into the database
   */
  private static async importBackupData(backupData: BackupData): Promise<void> {
    Logger.info('Importing backup data...');

    const { data } = backupData;

    await Promise.all([
      database.assets.bulkAdd(data.assets as IAsset[]),
      database.investments.bulkAdd(data.investments as IInvestment[]),
      database.sips.bulkAdd(data.sips as ISIP[]),
      database.expenses.bulkAdd(data.expenses as IExpense[]),
      database.loans.bulkAdd(data.loans as ILoan[]),
      database.emis.bulkAdd(data.emis as IEMI[]),
      database.payments.bulkAdd(data.payments as IPayment[]),
      database.goals.bulkAdd(data.goals as IGoal[]),
      database.allocations.bulkAdd(data.allocations as IAllocation[]),
      database.settings.bulkAdd(data.settings ?? []),
      database.currencyRates.bulkAdd(data.currencyRates ?? []),
      database.decisions.bulkAdd(data.decisions ?? []),
      database.memories.bulkAdd(data.memories ?? []),
    ]);

    Logger.info('Backup data imported successfully');
  }

  /**
   * Read file content as text
   */
  private static readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
}
