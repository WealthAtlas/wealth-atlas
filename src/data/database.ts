import Dexie, { Table, Transaction } from 'dexie';
import { IAsset } from '../domain/entities/assets/Asset';
import { IInvestment } from '../domain/entities/assets/Investment';
import { ISIP } from '../domain/entities/assets/SIP';
import { IExpense } from '../domain/entities/expenses/Expense';
import { IDecisionEntry } from '../domain/entities/journal/DecisionEntry';
import { IMemory } from '../domain/entities/memory/Memory';
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
import { upgradeSettingsRowToV8 } from './migrations/v8';
import { upgradeSettingsRowToV9 } from './migrations/v9';
import { upgradeSettingsRowToV11 } from './migrations/v11';
import { stampRowToV12 } from './migrations/v12';
import { hydrateAiProviderSettings } from './llm/state';
import { calendarDateModifications, normaliseCalendarDates } from './CalendarDateFields';
import { AutoSyncService } from './sync/AutoSyncService';
import type { MergeableRow } from './sync/merge/MergeRows';
import { stampOnCreate, stampOnUpdate, type IDeletion, type Synced } from './sync/merge/SyncMeta';
import { SYNCED_TABLES, type SyncedTableName } from './sync/merge/SyncedTables';

/**
 * Wraps a schema upgrade so its writes count as automatic.
 *
 * A migration is not the user changing their mind, and since v12 that has two
 * consequences rather than one. It must not wake a push — the pre-existing
 * reason. And it must not be stamped with the time of the upgrade: the
 * `updating` hook fires for the `modify` calls these handlers are made of, so
 * without this every migrated row would be dated the moment the new build was
 * installed, and *merely upgrading* would make a device outrank every real edit
 * sitting on every other device. `stampRowToV12` dates these rows to the epoch
 * on purpose, and this is what lets that survive the write.
 */
function migration(run: (trans: Transaction) => Promise<void>) {
  return (trans: Transaction) => AutoSyncService.withoutScheduling(() => run(trans));
}

export class WealthAtlasDB extends Dexie {
  // `Synced<T>` is the stored shape: the entity, plus the `uid` and `updatedAt`
  // a merge needs. They are not on the domain interfaces on purpose — see
  // `SyncMeta` — so the tables are where the store admits to holding them.
  assets!: Table<Synced<IAsset>>;
  investments!: Table<Synced<IInvestment>>;
  sips!: Table<Synced<ISIP>>;
  expenses!: Table<Synced<IExpense>>;
  loans!: Table<Synced<ILoan>>;
  emis!: Table<Synced<IEMI>>;
  payments!: Table<Synced<IPayment>>;
  goals!: Table<Synced<IGoal>>;
  allocations!: Table<Synced<IAllocation>>;
  settings!: Table<Synced<ISettings>>;
  currencyRates!: Table<Synced<ICurrencyRate>>;
  decisions!: Table<Synced<IDecisionEntry>>;
  memories!: Table<Synced<IMemory>>;
  /** Tombstones: the rows that were deleted, so the deletion can travel. */
  deletions!: Table<IDeletion>;

  constructor() {
    super('WealthAtlasDB');
    this.setupSchema();
    this.setupSyncMeta();
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
      .upgrade(
        migration(async trans => {
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
        })
      );

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
      .upgrade(
        migration(async trans => {
          await trans.table('investments').toCollection().modify(upgradeInvestmentRowToV4);
          await trans.table('expenses').toCollection().modify(upgradeExpenseRowToV4);
          await trans.table('assets').toCollection().modify(upgradeCurrencyBearingRowToV4);
          await trans.table('loans').toCollection().modify(upgradeCurrencyBearingRowToV4);
          await trans.table('goals').toCollection().modify(upgradeCurrencyBearingRowToV4);
        })
      );

    // Migration: v5 - Base-currency reporting. Adds the `settings` singleton
    // (base currency) and one `currencyRates` row per non-base currency. Dexie
    // carries every unchanged table forward, so only the new stores are listed.
    this.version(5)
      .stores({
        settings: 'id',
        currencyRates: '++id, &code',
      })
      .upgrade(
        migration(async trans => {
          await trans.table('settings').put(defaultSettings());
        })
      );

    // Migration: v6 - The currency list becomes configurable, so the settings
    // singleton carries the codes this user's data may use. No new tables.
    this.version(6).upgrade(
      migration(async trans => {
        await trans.table('settings').toCollection().modify(upgradeSettingsRowToV6);
      })
    );

    // Migration: v7 - The AI provider configuration joins the settings
    // singleton, so it syncs with everything else in Settings. No new tables.
    this.version(7).upgrade(
      migration(async trans => {
        await trans.table('settings').toCollection().modify(upgradeSettingsRowToV7);
      })
    );

    // Migration: v8 - The target allocation joins the settings singleton: the
    // share of the portfolio the user intends to hold per asset category. A
    // field on an existing row, so no new tables, and `db.settings` is already
    // in the auto-sync hook list.
    this.version(8).upgrade(
      migration(async trans => {
        await trans.table('settings').toCollection().modify(upgradeSettingsRowToV8);
      })
    );

    // Migration: v9 - The news provider key joins the settings singleton, so
    // market sentiment comes from a real feed. A field on an existing row, so no
    // new tables.
    this.version(9).upgrade(
      migration(async trans => {
        await trans.table('settings').toCollection().modify(upgradeSettingsRowToV9);
      })
    );

    // Migration: v10 - The decision journal. The first new table since v5, so
    // the first change to also need the auto-sync hook list, the snapshot's
    // table list and `rehydrateSnapshotDates`. Indexed on the fields the journal
    // is actually queried by: newest first, and filtered by category.
    // Dexie creates the store, so there is no row transform to run.
    this.version(10).stores({
      decisions: '++id, createdAt, category, action, status',
    });

    // Migration: v11 - The assistant's memory: durable facts about the user,
    // kept between conversations. A new table, so the auto-sync hook list, the
    // snapshot's table list and `rehydrateSnapshotDates` all move with it. No
    // secondary index: the whole set is read on every turn to build the prompt
    // and is capped at `MEMORY_LIMIT`, so there is nothing to query by. The row
    // transform is for the settings singleton, which gains the on/off switch.
    this.version(11)
      .stores({
        memories: '++id',
      })
      .upgrade(
        migration(async trans => {
          await trans.table('settings').toCollection().modify(upgradeSettingsRowToV11);
        })
      );

    // Migration: v12 - Row-level merge. Every synced table gains `uid` (the same
    // logical row on every device, because `++id` counters are per-device) and
    // `updatedAt` (the tiebreak when both devices changed one row), and the new
    // `deletions` table carries tombstones so a delete is not undone by the next
    // device that has not heard about it.
    //
    // `uid` is indexed because every merge looks rows up by it. Not `&uid`: a
    // unique index would abort the whole upgrade over one duplicate in a store
    // this migration cannot inspect first, and the merge already treats a uid as
    // one row.
    this.version(12)
      .stores({
        assets:
          '++id, uid, name, description, category, currency, valueModel, interestRate, maturityDate, maturityAmount, manualValue, manualValueUpdatedAt, scriptValue, scriptValueUpdatedAt',
        investments: '++id, uid, assetId, sipId, type, quantity, totalAmount, date',
        sips: '++id, uid, assetId, quantity, price, startDate, endDate, frequency, lastGeneratedDate',
        expenses: '++id, uid, amount, currency, date, category, isEssential, description',
        loans: '++id, uid, name, principalAmount, currency, startDate, description',
        emis: '++id, uid, loanId, name, amount, frequency, startDate, endDate, lastGeneratedDate',
        payments: '++id, uid, loanId, emiId, date, amount, description',
        goals: '++id, uid, name, targetAmount, maturityDate, inflationRate, currency, createdAt',
        allocations: '++id, uid, assetId, goalId, allocationPercentage',
        settings: 'id',
        currencyRates: '++id, &code, uid',
        decisions: '++id, uid, createdAt, category, action, status',
        memories: '++id, uid',
        deletions: '++id, [table+key], deletedAt',
      })
      .upgrade(
        migration(async trans => {
          for (const table of SYNCED_TABLES) {
            await trans.table(table.name).toCollection().modify(stampRowToV12);
          }
        })
      );
  }

  /**
   * Keeps `uid` and `updatedAt` true for every write, in one place.
   *
   * A repository cannot forget to stamp a row here, and a new one cannot be
   * written without it — which matters because a row that reaches the store
   * without a uid is invisible to every future merge.
   *
   * A write made under `AutoSyncService.withoutScheduling` gets a uid but no new
   * timestamp. That flag already means "not the user changing their mind" — a
   * startup SIP conversion, a script value refresh, a migration — and such a
   * write must not claim to be the latest change: `updateValues()` runs on every
   * launch, and bumping every asset's `updatedAt` would have merely opening the
   * app outrank a real edit made on another device an hour earlier.
   */
  private setupSyncMeta(): void {
    const tables: Table<MergeableRow>[] = [
      this.assets,
      this.investments,
      this.sips,
      this.expenses,
      this.loans,
      this.emis,
      this.payments,
      this.goals,
      this.allocations,
      this.settings,
      this.currencyRates,
      this.decisions,
      this.memories,
    ] as unknown as Table<MergeableRow>[];

    for (const table of tables) {
      table.hook('creating', (_primKey, obj) => {
        // Date-only columns are truncated here for the same reason the sync
        // columns are maintained here: so no repository can forget. See
        // `CalendarDateFields` for which columns are days and which are instants.
        normaliseCalendarDates(table.name, obj as unknown as Record<string, unknown>);
        stampOnCreate(obj, AutoSyncService.isSuppressed());
      });
      table.hook('updating', (modifications, _primKey, obj) => {
        const mods = modifications as Record<string, unknown>;
        const days = calendarDateModifications(table.name, mods);
        // The truncations are folded into `mods` before `stampOnUpdate` reads it,
        // so `isNoOpUpdate` judges the values that will actually be stored: a
        // re-save of an already-clean row stays a no-op and arms no push, while
        // one that genuinely normalises a legacy value counts as the change it is.
        Object.assign(mods, days);
        return { ...days, ...stampOnUpdate(mods, obj, AutoSyncService.isSuppressed()) };
      });
    }
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
  db.decisions,
  db.memories,
  // Last, and required: a repository delete writes a tombstone in the same
  // transaction as the delete, so a whole-database transaction that omitted this
  // table would make every delete inside it throw.
  db.deletions,
];

/**
 * The store behind a table name, for code that works over the table registry
 * rather than over one entity — the merge and the tombstone writer.
 */
const TABLES_BY_NAME: Record<SyncedTableName, Table<MergeableRow>> = {
  assets: db.assets,
  investments: db.investments,
  sips: db.sips,
  expenses: db.expenses,
  loans: db.loans,
  emis: db.emis,
  payments: db.payments,
  goals: db.goals,
  allocations: db.allocations,
  settings: db.settings,
  currencyRates: db.currencyRates,
  decisions: db.decisions,
  memories: db.memories,
} as unknown as Record<SyncedTableName, Table<MergeableRow>>;

export function tableByName(name: SyncedTableName): Table<MergeableRow> {
  return TABLES_BY_NAME[name];
}

/**
 * Why the store would not open.
 *
 * `stale-build` is the one that matters, and it is not a corruption: IndexedDB
 * refuses to open a database at a version higher than the code asks for, so it
 * means *this bundle is older than the data on this device*. A PWA makes that
 * ordinary rather than exotic — a service worker can serve a precached build for
 * as long as it likes, and one device updating before another is the whole
 * premise of syncing.
 */
export type DatabaseOpenFailure = 'stale-build' | 'unavailable';

/**
 * Opens the store, reporting why rather than throwing.
 *
 * Nothing used to ask. Dexie opens lazily on the first query, so a store that
 * cannot open surfaced as every screen failing at once with no explanation —
 * and the only remedy a user can find on their own is to clear the site's
 * storage, which is where all their records are. That is how a failure to
 * *read* became a permanent loss.
 */
export async function openDatabase(): Promise<DatabaseOpenFailure | undefined> {
  try {
    await db.open();
    return undefined;
  } catch (error) {
    // Dexie re-throws IndexedDB's own error, so the name is the browser's.
    const name = error instanceof Error ? error.name : '';
    if (name === 'VersionError') return 'stale-build';
    return 'unavailable';
  }
}

/**
 * Runs `fn` inside a single read-write transaction spanning every table, so a
 * multi-entity write (such as applying an import plan) is all-or-nothing.
 */
export function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  return db.transaction('rw', ALL_TABLES, fn);
}
