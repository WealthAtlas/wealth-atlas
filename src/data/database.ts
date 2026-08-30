import Dexie, { Table } from 'dexie';
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
import { ISettings } from '../domain/entities/shared/Settings';
import { hydrateAiProviderSettings } from './llm/state';
import { calendarDateModifications, normaliseCalendarDates } from './CalendarDateFields';
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
  decisions!: Table<IDecisionEntry>;
  memories!: Table<IMemory>;

  constructor() {
    super('WealthAtlasDB');
    this.setupSchema();
    this.setupCalendarDates();
    this.setupAutoSync();
  }

  /**
   * One version, declared whole.
   *
   * Dexie diffs this against whatever the device actually holds, so a store left
   * at an older version picks up the index changes on open and nothing else.
   * There are no upgrade handlers on purpose: every transform the earlier
   * versions ran has long since run on every device that was there for it, and a
   * handler kept only for a device nobody has is a handler nothing tests.
   *
   * `deletions` is absent rather than dropped explicitly — a store not named
   * here is one Dexie removes — because a tombstone only ever meant something to
   * the row-level merge that no longer exists.
   */
  private setupSchema(): void {
    this.version(13).stores({
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
      settings: 'id',
      currencyRates: '++id, &code',
      decisions: '++id, createdAt, category, action, status',
      memories: '++id',
    });
  }

  /**
   * Truncates every calendar-day column on the way in, in one place.
   *
   * A repository cannot forget it here, and a new one cannot be written without
   * it. See `CalendarDateFields` for which columns are days and which are
   * instants, and why the distinction is load-bearing.
   */
  private setupCalendarDates(): void {
    const tables: Table<Record<string, unknown>>[] = [
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
    ] as unknown as Table<Record<string, unknown>>[];

    for (const table of tables) {
      table.hook('creating', (_primKey, obj) => {
        normaliseCalendarDates(table.name, obj as unknown as Record<string, unknown>);
      });
      table.hook('updating', modifications => {
        const mods = modifications as Record<string, unknown>;
        const days = calendarDateModifications(table.name, mods);
        // Folded into `mods` as well as returned, so that `AutoSyncService`'s own
        // `updating` hook judges the values that will actually be stored: a
        // re-save of an already-clean row stays a no-op and arms no push, while
        // one that genuinely normalises a legacy value counts as the change it is.
        Object.assign(mods, days);
        return days;
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
];

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
