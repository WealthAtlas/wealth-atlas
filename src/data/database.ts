import Dexie, { Table } from 'dexie';
import { IAsset } from '../domain/entities/assets/Asset';
import { IInvestment } from '../domain/entities/assets/Investment';
import { ISIP } from '../domain/entities/assets/SIP';
import { IExpense } from '../domain/entities/expenses/Expense';
import { IAllocation } from '../domain/entities/goals/Allocation';
import { IGoal } from '../domain/entities/goals/Goal';
import { IEMI } from '../domain/entities/loans/EMI';
import { ILoan } from '../domain/entities/loans/Loan';
import { IPayment } from '../domain/entities/loans/Payment';
import { ICurrencyRate } from '../domain/entities/shared/CurrencyRate';
import { defaultSettings, ISettings } from '../domain/entities/shared/Settings';
import {
  upgradeCurrencyBearingRowToV4,
  upgradeExpenseRowToV4,
  upgradeInvestmentRowToV4,
} from './migrations/v4';
import { upgradeSettingsRowToV6 } from './migrations/v6';
import { upgradeSettingsRowToV7 } from './migrations/v7';
import { hydrateAiProviderSettings } from './llm/state';
import { AutoSyncService } from './sync/AutoSyncService';

export class WealthAtlasDB extends Dexie {
  assets!: Table<IAsset>;
  investments!: Table<IInvestment>;
  sips!: Table<ISIP>;
  expenses!: Table<IExpense>;
  loans!: Table<ILoan>;
  emis!: Table<IEMI>;
  payments!: Table<IPayment>;
  goals!: Table<IGoal>;
  allocations!: Table<IAllocation>;
  settings!: Table<ISettings>;
  currencyRates!: Table<ICurrencyRate>;

  constructor() {
    super('WealthAtlasDB');
    this.setupSchema();
    this.setupAutoSync();
  }

  private setupSchema(): void {
    // Migration: v3 - Rename marketValue/marketValueUpdatedAt to manualValue/manualValueUpdatedAt, add scriptValue/scriptValueUpdatedAt
    this.version(3)
      .stores({
        assets:
          '++id, name, description, category, currency, valueModel, interestRate, maturityDate, maturityAmount, manualValue, manualValueUpdatedAt, scriptValue, scriptValueUpdatedAt, apiPath',
        investments: '++id, assetId, sipId, type, quantity, price, date',
        sips: '++id, assetId, quantity, price, startDate, endDate, frequency, executedTill',
        expenses: '++id, amount, currency, date, category, isEssential, description',
        loans: '++id, name, lenderName, principalAmount, currency, startDate, description',
        emis: '++id, loanId, name, amount, frequency, startDate, endDate, lastGeneratedDate',
        payments: '++id, loanId, emiId, date, amount, isPaid, description',
        goals: '++id, name, targetAmount, maturityDate, inflationRate, currency, createdAt',
        allocations: '++id, assetId, goalId, allocationPercentage, createdAt',
      })
      .upgrade(async trans => {
        // Rename fields in assets table
        const assets = await trans.table('assets').toArray();
        for (const asset of assets) {
          if (asset.marketValue !== undefined) {
            asset.manualValue = asset.marketValue;
            delete asset.marketValue;
          }
          if (asset.marketValueUpdatedAt !== undefined) {
            asset.manualValueUpdatedAt = asset.marketValueUpdatedAt;
            delete asset.marketValueUpdatedAt;
          }
          // Add scriptValue/scriptValueUpdatedAt as undefined if not present
          if (asset.scriptValue === undefined) {
            asset.scriptValue = undefined;
          }
          if (asset.scriptValueUpdatedAt === undefined) {
            asset.scriptValueUpdatedAt = undefined;
          }
          await trans.table('assets').put(asset);
        }
      });

    // Migration: v4 - Rename investments.price to totalAmount and store sell amounts
    // positive (direction now lives in `type`); normalise expense currency from
    // symbol to ISO code. Also drops indexes on fields that no longer exist.
    this.version(4)
      .stores({
        assets:
          '++id, name, description, category, currency, valueModel, interestRate, maturityDate, maturityAmount, manualValue, manualValueUpdatedAt, scriptValue, scriptValueUpdatedAt',
        investments: '++id, assetId, sipId, type, quantity, totalAmount, date',
        sips: '++id, assetId, quantity, price, startDate, endDate, frequency, lastGeneratedDate',
        expenses: '++id, amount, currency, date, category, isEssential, description',
        loans: '++id, name, principalAmount, currency, startDate, description',
        emis: '++id, loanId, name, amount, frequency, startDate, endDate, lastGeneratedDate',
        payments: '++id, loanId, emiId, date, amount, description',
        goals: '++id, name, targetAmount, maturityDate, inflationRate, currency, createdAt',
        allocations: '++id, assetId, goalId, allocationPercentage',
      })
      .upgrade(async trans => {
        await trans.table('investments').toCollection().modify(upgradeInvestmentRowToV4);
        await trans.table('expenses').toCollection().modify(upgradeExpenseRowToV4);
        await trans.table('assets').toCollection().modify(upgradeCurrencyBearingRowToV4);
        await trans.table('loans').toCollection().modify(upgradeCurrencyBearingRowToV4);
        await trans.table('goals').toCollection().modify(upgradeCurrencyBearingRowToV4);
      });

    // Migration: v5 - Base-currency reporting. Adds the `settings` singleton
    // (base currency) and one `currencyRates` row per non-base currency. Dexie
    // carries every unchanged table forward, so only the new stores are listed.
    this.version(5)
      .stores({
        settings: 'id',
        currencyRates: '++id, &code',
      })
      .upgrade(async trans => {
        await trans.table('settings').put(defaultSettings());
      });

    // Migration: v6 - The currency list becomes configurable, so the settings
    // singleton carries the codes this user's data may use. No new tables.
    this.version(6).upgrade(async trans => {
      await trans.table('settings').toCollection().modify(upgradeSettingsRowToV6);
    });

    // Migration: v7 - The AI provider configuration joins the settings
    // singleton, so it syncs with everything else in Settings. No new tables.
    this.version(7).upgrade(async trans => {
      await trans.table('settings').toCollection().modify(upgradeSettingsRowToV7);
    });
  }

  private setupAutoSync(): void {
    // Initialize auto-sync service when database is ready
    this.on('ready', async () => {
      // Hydration first, and deliberately before the change hooks are listening.
      // Dexie holds every other query until this resolves, which is what lets the
      // AI provider config be read synchronously everywhere else: any code that
      // has seen a database row has, by then, a warm cache.
      //
      // It can also write — the one-time adoption of the pre-v7 localStorage keys
      // — and that write must not schedule a push, or a device upgrading would
      // race its own first pull and whichever won would decide whose provider
      // config survived. `App` registers the hooks eagerly too, so suppressing is
      // what settles it rather than the ordering here.
      await AutoSyncService.withoutScheduling(() => hydrateAiProviderSettings());
      AutoSyncService.startListening();
    });
  }
}

export const db = new WealthAtlasDB();

/** Every table, in dependency order. Used for whole-database transactions. */
export const ALL_TABLES = [
  db.assets,
  db.investments,
  db.sips,
  db.expenses,
  db.loans,
  db.emis,
  db.payments,
  db.goals,
  db.allocations,
  db.settings,
  db.currencyRates,
];

/**
 * Runs `fn` inside a single read-write transaction spanning every table, so a
 * multi-entity write (such as applying an import plan) is all-or-nothing.
 */
export function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  return db.transaction('rw', ALL_TABLES, fn);
}
