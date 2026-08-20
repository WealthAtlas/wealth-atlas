import { db as database } from '@/data/database';
import { rehydrateSnapshotDates } from '@/data/migrations/rehydrateDates';
import { upgradeSnapshotDataToV4 } from '@/data/migrations/v4';
import { upgradeSnapshotDataToV5 } from '@/data/migrations/v5';
import { IAsset } from '@/domain/entities/assets/Asset';
import { IInvestment } from '@/domain/entities/assets/Investment';
import { ISIP } from '@/domain/entities/assets/SIP';
import { IExpense } from '@/domain/entities/expenses/Expense';
import { IAllocation } from '@/domain/entities/goals/Allocation';
import { IGoal } from '@/domain/entities/goals/Goal';
import { IEMI } from '@/domain/entities/loans/EMI';
import { ILoan } from '@/domain/entities/loans/Loan';
import { IPayment } from '@/domain/entities/loans/Payment';
import { ICurrencyRate } from '@/domain/entities/shared/CurrencyRate';
import { ISettings } from '@/domain/entities/shared/Settings';
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
  };
}

export class BackupService {
  /**
   * v2.0.0: investments.price -> totalAmount (sells stored positive) and expense
   * currency stored as an ISO code. v1.0.0 files are migrated on restore.
   * v2.1.0: adds the settings singleton (base currency) and currency rates. New
   * tables only, so 2.0.0 files stay restorable and simply pick up the defaults.
   */
  private static readonly BACKUP_VERSION = '2.1.0';

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
          settings,
          currencyRates,
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

      // Clear all existing data
      await this.clearAllData();

      // Import the new data
      await this.importBackupData(backupData);

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

    rehydrateSnapshotDates(data);
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
