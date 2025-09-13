import { database } from '@/data/database';
import { IAsset } from '@/domain/entities/assets/Asset';
import { IInvestment } from '@/domain/entities/assets/Investment';
import { ISIP } from '@/domain/entities/assets/SIP';
import { IExpense } from '@/domain/entities/expenses/Expense';
import { IAllocation } from '@/domain/entities/goals/Allocation';
import { IGoal } from '@/domain/entities/goals/Goal';
import { IEMI } from '@/domain/entities/loans/EMI';
import { ILoan } from '@/domain/entities/loans/Loan';
import { IPayment } from '@/domain/entities/loans/Payment';
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
  };
}

export class BackupService {
  private static readonly BACKUP_VERSION = '1.0.0';

  /**
   * Export all data from the database as a JSON string
   */
  static async exportData(): Promise<string> {
    try {
      Logger.info('Starting data export...');

      const [assets, investments, sips, expenses, loans, emis, payments, goals, allocations] =
        await Promise.all([
          database.assets.toArray(),
          database.investments.toArray(),
          database.sips.toArray(),
          database.expenses.toArray(),
          database.loans.toArray(),
          database.emis.toArray(),
          database.payments.toArray(),
          database.goals.toArray(),
          database.allocations.toArray(),
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
