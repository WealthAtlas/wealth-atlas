import { db as database } from '@/data/database';
import { rehydrateSnapshotDates } from '@/data/migrations/rehydrateDates';
import { upgradeSnapshotDataToV4 } from '@/data/migrations/v4';
import { upgradeSnapshotDataToV5 } from '@/data/migrations/v5';
import { upgradeSnapshotDataToV6 } from '@/data/migrations/v6';
import { upgradeSnapshotDataToV7 } from '@/data/migrations/v7';
import { upgradeSnapshotDataToV8 } from '@/data/migrations/v8';
import { upgradeSnapshotDataToV9 } from '@/data/migrations/v9';
import { upgradeSnapshotDataToV10 } from '@/data/migrations/v10';
import { emitDatabaseReplaced } from '@/data/databaseEvents';
import { hydrateAiProviderSettings } from '@/data/llm/state';
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
  };
}

export class BackupService {
  /**
   * v2.0.0: investments.price -> totalAmount (sells stored positive) and expense
   * currency stored as an ISO code. v1.0.0 files are migrated on restore.
   * v2.1.0: adds the settings singleton (base currency) and currency rates. New
   * tables only, so 2.0.0 files stay restorable and simply pick up the defaults.
   * v2.2.0: settings.currencies — the configurable currency list.
   * v2.3.0: settings.ai — the AI provider configuration. Unlike the sync
   * snapshot, this file is plaintext on the user's disk, so the API key is
   * stripped on export and the key already on the device is kept on restore.
   * v2.4.0: settings.targetAllocation — the intended share per asset category.
   * Exported in full: it is the user's own policy, not a credential.
   * v2.5.0: settings.news — the news provider key. Stripped on export and kept
   * from the device on restore, exactly like `ai.apiKey`: this file is plaintext
   * on the user's disk.
   * v2.6.0: the `decisions` table — the decision journal. Exported in full: it
   * is the user's own reasoning, and a journal that did not survive a restore
   * would lose exactly the history that makes it worth keeping.
   */
  private static readonly BACKUP_VERSION = '2.6.0';

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
      ]);

      const backupData: BackupData = {
        version: this.BACKUP_VERSION,
        timestamp: new Date().toISOString(),
        data: {
          assets,
          investments,
          sips,
          expenses,
          loans,
          emis,
          payments,
          goals,
          allocations,
          settings: settings.map(row => this.withoutApiKey(row)),
          currencyRates,
          decisions,
        },
      };

      const jsonString = JSON.stringify(backupData, null, 2);
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

      // Bring older files up to the current row shape, then turn the ISO date
      // strings JSON gave us back into real Dates before they hit IndexedDB.
      this.upgradeBackupData(backupData);

      // The file carries no API key, so the one on this device is the only one
      // there is. Decided before the wipe, while it can still be read.
      await this.carryOverApiKey(backupData);
      await this.carryOverNewsApiKey(backupData);

      // Clear all existing data
      await this.clearAllData();

      // Import the new data
      await this.importBackupData(backupData);

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
   * Migrate an older backup file to the current row shape and rehydrate dates.
   * Mutates `backupData` in place.
   */
  private static upgradeBackupData(backupData: BackupData): void {
    const data = backupData.data as unknown as Record<string, Record<string, unknown>[]>;
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

    if (majorVersion < 2) {
      Logger.info(`Migrating backup from v${backupData.version} to v${this.BACKUP_VERSION}`);
      upgradeSnapshotDataToV4(data);
      backupData.version = this.BACKUP_VERSION;
    }

    // Idempotent, and cheap enough to run for every file: it keeps a valid
    // settings row as-is and otherwise supplies the default base currency, which
    // is exactly what a pre-2.1.0 file needs.
    upgradeSnapshotDataToV5(data);
    upgradeSnapshotDataToV6(data);
    upgradeSnapshotDataToV7(data);
    upgradeSnapshotDataToV8(data);
    upgradeSnapshotDataToV9(data);
    upgradeSnapshotDataToV10(data);

    rehydrateSnapshotDates(data);
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
