import type { IAsset } from '@/domain/entities/assets/Asset';
import type { IInvestment } from '@/domain/entities/assets/Investment';
import type { ISIP } from '@/domain/entities/assets/SIP';
import type { IExpense } from '@/domain/entities/expenses/Expense';
import type { IAllocation } from '@/domain/entities/goals/Allocation';
import type { IGoal } from '@/domain/entities/goals/Goal';
import type { IEMI } from '@/domain/entities/loans/EMI';
import type { ILoan } from '@/domain/entities/loans/Loan';
import type { IPayment } from '@/domain/entities/loans/Payment';
import type { ICurrencyRate } from '@/domain/entities/shared/CurrencyRate';
import type { ISettings } from '@/domain/entities/shared/Settings';
import { Logger } from '@/domain/utils/Logger';
import { db } from '../database';
import { rehydrateSnapshotDates } from '../migrations/rehydrateDates';
import { upgradeSnapshotDataToV4 } from '../migrations/v4';
import { upgradeSnapshotDataToV5 } from '../migrations/v5';
import { upgradeSnapshotDataToV6 } from '../migrations/v6';
import { buildSyncApiUrl } from './config';
import { CryptoMeta, decryptJson, encryptJson } from './crypto';
import {
  getAutoSyncEnabled,
  getKeyId,
  getLastRemoteVersion,
  getLastSyncAt,
  getPassphrase,
  setAutoSyncEnabled,
  setKeyId,
  setLastRemoteVersion,
  setLastSyncAt,
  setPassphrase,
} from './state';
import { RemoteDataResponse, Snapshot, SyncStatus } from './types';

export class SyncApiError extends Error {
  constructor(
    readonly status: number,
    message: string
  ) {
    super(message);
    this.name = 'SyncApiError';
  }
}

// Simple fetch wrapper with configurable API base URL
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildSyncApiUrl(path);
  // Content-Type only goes on requests that carry a body. On a GET it makes an
  // otherwise "simple" request preflighted, which doubles the calls billed
  // against the API for every poll.
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json', ...init?.headers } : init?.headers,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new SyncApiError(res.status, `API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Backends predating the /version route answer 403 ("Missing Authentication
 * Token" — API Gateway's response to an unmatched path). Remembered per session
 * so we probe once rather than on every poll.
 */
let versionEndpointSupported = true;

/**
 * Asks only for the version, which is all a poll needs. Returns undefined when
 * the answer isn't trustworthy, which means "check the slow way" — never
 * "nothing changed", or a real update would be skipped.
 */
async function fetchRemoteVersion(keyId: string): Promise<number | undefined> {
  if (!versionEndpointSupported) return undefined;
  try {
    const resp = await api<{ version: number }>(`/data/${encodeURIComponent(keyId)}/version`);
    return resp.version;
  } catch (error) {
    if (error instanceof SyncApiError && error.status === 403) {
      versionEndpointSupported = false;
      Logger.info('Sync backend has no /version endpoint; falling back to full pulls');
    }
    return undefined;
  }
}

/**
 * Sync snapshot version. This is its own counter and does NOT track the Dexie
 * version — v8 snapshots predate this comment. Bump it whenever the shape of a
 * persisted row changes and add an upgrade step to `upgradeSnapshot` below.
 *
 * v9: investments.price -> totalAmount (sells positive), expense currency
 *     stored as ISO code rather than symbol.
 * v10: adds the `settings` singleton (base currency) and `currencyRates`. New
 *     tables only, so an older snapshot just needs the settings seed.
 * v11: settings.currencies — the configurable currency list.
 */
const SNAPSHOT_VERSION = 11;
const OLDEST_SUPPORTED_SNAPSHOT_VERSION = 8;

function getSchemaVersion(): number {
  return SNAPSHOT_VERSION;
}

/**
 * Brings an older snapshot up to SNAPSHOT_VERSION in place. Older builds wrote
 * v8; rejecting those outright would make a pull silently unusable, so migrate
 * instead.
 */
function upgradeSnapshot(snapshot: Snapshot): Snapshot {
  if (snapshot.schemaVersion === SNAPSHOT_VERSION) return snapshot;

  if (snapshot.schemaVersion < OLDEST_SUPPORTED_SNAPSHOT_VERSION) {
    throw new Error(
      `Remote snapshot is too old to migrate (remote=${snapshot.schemaVersion}, ` +
        `oldest supported=${OLDEST_SUPPORTED_SNAPSHOT_VERSION}).`
    );
  }

  if (snapshot.schemaVersion > SNAPSHOT_VERSION) {
    throw new Error(
      `Remote snapshot is newer than this app (remote=${snapshot.schemaVersion}, ` +
        `local=${SNAPSHOT_VERSION}). Update this device before syncing.`
    );
  }

  const data = snapshot.data as unknown as Record<string, Record<string, unknown>[]>;
  // Each step is gated on the version that introduced it: the v4 transforms are
  // idempotent, but re-running them on a v9 snapshot would be needless work and
  // makes the upgrade path harder to read as more steps land.
  if (snapshot.schemaVersion < 9) {
    upgradeSnapshotDataToV4(data);
  }
  if (snapshot.schemaVersion < 10) {
    upgradeSnapshotDataToV5(data);
  }
  if (snapshot.schemaVersion < 11) {
    upgradeSnapshotDataToV6(data);
  }
  Logger.info(`Upgraded sync snapshot from v${snapshot.schemaVersion} to v${SNAPSHOT_VERSION}`);
  return { ...snapshot, schemaVersion: SNAPSHOT_VERSION };
}

/**
 * Snapshots travel as JSON, so every Date column arrives as a string. Convert
 * them back before writing or the store ends up with mixed types.
 */
function rehydrateSnapshot(snapshot: Snapshot): void {
  rehydrateSnapshotDates(snapshot.data as unknown as Record<string, Record<string, unknown>[]>);
}

async function exportSnapshot(): Promise<Snapshot> {
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
    db.assets.toArray(),
    db.investments.toArray(),
    db.sips.toArray(),
    db.expenses.toArray(),
    db.loans.toArray(),
    db.emis.toArray(),
    db.payments.toArray(),
    db.goals.toArray(),
    db.allocations.toArray(),
    db.settings.toArray(),
    db.currencyRates.toArray(),
  ]);
  return {
    schemaVersion: getSchemaVersion(),
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
}

async function importSnapshot(incoming: Snapshot): Promise<void> {
  const snapshot = upgradeSnapshot(incoming);
  rehydrateSnapshot(snapshot);
  await db.transaction(
    'rw',
    [
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
    ],
    async () => {
      await Promise.all([
        db.currencyRates.clear(),
        db.settings.clear(),
        db.allocations.clear(),
        db.goals.clear(),
        db.payments.clear(),
        db.emis.clear(),
        db.loans.clear(),
        db.expenses.clear(),
        db.sips.clear(),
        db.investments.clear(),
        db.assets.clear(),
      ]);
      const d = snapshot.data as {
        assets?: IAsset[];
        investments?: IInvestment[];
        sips?: ISIP[];
        expenses?: IExpense[];
        loans?: ILoan[];
        emis?: IEMI[];
        payments?: IPayment[];
        goals?: IGoal[];
        allocations?: IAllocation[];
        settings?: ISettings[];
        currencyRates?: ICurrencyRate[];
      };
      // Order respects dependencies
      await db.assets.bulkPut(d.assets || []);
      await db.investments.bulkPut(d.investments || []);
      await db.sips.bulkPut(d.sips || []);
      await db.expenses.bulkPut(d.expenses || []);
      await db.loans.bulkPut(d.loans || []);
      await db.emis.bulkPut(d.emis || []);
      await db.payments.bulkPut(d.payments || []);
      await db.goals.bulkPut(d.goals || []);
      await db.allocations.bulkPut(d.allocations || []);
      await db.settings.bulkPut(d.settings || []);
      await db.currencyRates.bulkPut(d.currencyRates || []);
    }
  );
}

export class SyncService {
  static getStatus(): SyncStatus {
    return {
      enabled: Boolean(getKeyId()),
      keyId: getKeyId(),
      lastRemoteVersion: getLastRemoteVersion(),
      lastSyncAt: getLastSyncAt(),
      autoSyncEnabled: getAutoSyncEnabled(),
      hasStoredPassphrase: Boolean(getPassphrase()),
    };
  }

  static async setupSync(
    passphrase: string,
    enableAutoSync = false
  ): Promise<{ keyId: string; version: number }> {
    const snapshot = await exportSnapshot();
    const { payload, meta } = await encryptJson(snapshot, passphrase, snapshot.schemaVersion);
    const resp = await api<RemoteDataResponse<CryptoMeta>>('/data', {
      method: 'POST',
      body: JSON.stringify({ payload, meta }),
    });
    setKeyId(resp.keyId);
    setLastRemoteVersion(resp.version);
    setLastSyncAt(new Date().toISOString());

    if (enableAutoSync) {
      setPassphrase(passphrase);
      setAutoSyncEnabled(true);
    }

    return { keyId: resp.keyId, version: resp.version };
  }

  static async linkSync(keyId: string, passphrase: string, enableAutoSync = false): Promise<void> {
    const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);
    const snapshot = await decryptJson<Snapshot>(resp.payload, resp.meta, passphrase);
    await importSnapshot(snapshot);
    setKeyId(resp.keyId);
    setLastRemoteVersion(resp.version);
    setLastSyncAt(new Date().toISOString());

    if (enableAutoSync) {
      setPassphrase(passphrase);
      setAutoSyncEnabled(true);
    }
  }

  static async pull(passphrase?: string): Promise<{ version: number | null }> {
    const keyId = getKeyId();
    if (!keyId) throw new Error('Sync not set up');

    const actualPassphrase = passphrase || getPassphrase();
    if (!actualPassphrase) throw new Error('No passphrase provided and none stored');

    const last = getLastRemoteVersion() ?? 0;

    // The overwhelmingly common outcome of a poll is "nothing changed", so settle
    // that against a few bytes instead of downloading the whole snapshot.
    const remoteVersion = await fetchRemoteVersion(keyId);
    if (remoteVersion !== undefined && remoteVersion <= last) return { version: null };

    const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);
    // Re-checked against the payload's own version: the pointer can sit one
    // ahead of the blob after an interrupted push.
    if (resp.version <= last) return { version: null };
    const snapshot = await decryptJson<Snapshot>(resp.payload, resp.meta, actualPassphrase);
    await importSnapshot(snapshot);
    setLastRemoteVersion(resp.version);
    setLastSyncAt(new Date().toISOString());

    // Store passphrase if auto-sync is enabled and passphrase was provided manually
    if (getAutoSyncEnabled() && passphrase && !getPassphrase()) {
      setPassphrase(passphrase);
    }

    return { version: resp.version };
  }

  static async push(passphrase?: string): Promise<{ version: number }> {
    const keyId = getKeyId();
    if (!keyId) throw new Error('Sync not set up');

    const actualPassphrase = passphrase || getPassphrase();
    if (!actualPassphrase) throw new Error('No passphrase provided and none stored');

    const snapshot = await exportSnapshot();
    const { payload, meta } = await encryptJson(snapshot, actualPassphrase, snapshot.schemaVersion);
    const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`, {
      method: 'PUT',
      body: JSON.stringify({ payload, meta }),
    });
    setLastRemoteVersion(resp.version);
    setLastSyncAt(new Date().toISOString());

    // Store passphrase if auto-sync is enabled and passphrase was provided manually
    if (getAutoSyncEnabled() && passphrase && !getPassphrase()) {
      setPassphrase(passphrase);
    }

    return { version: resp.version };
  }

  static async changePassphrase(oldPass: string, newPass: string): Promise<void> {
    const keyId = getKeyId();
    if (!keyId) throw new Error('Sync not set up');
    const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);
    const snapshot = await decryptJson<Snapshot>(resp.payload, resp.meta, oldPass);
    const { payload, meta } = await encryptJson(snapshot, newPass, snapshot.schemaVersion);
    await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`, {
      method: 'PUT',
      body: JSON.stringify({ payload, meta }),
    });
    setLastSyncAt(new Date().toISOString());

    // Update stored passphrase if auto-sync is enabled
    if (getAutoSyncEnabled()) {
      setPassphrase(newPass);
    }
  }

  static async unlink(): Promise<void> {
    setKeyId(undefined);
    setLastRemoteVersion(undefined);
    setLastSyncAt(undefined);
    setPassphrase(undefined);
    setAutoSyncEnabled(false);
  }

  static setAutoSyncEnabled(enabled: boolean): void {
    setAutoSyncEnabled(enabled);
    if (!enabled) {
      setPassphrase(undefined);
      // Import AutoSyncService here to avoid circular dependency
      import('./AutoSyncService').then(({ AutoSyncService }) => {
        AutoSyncService.stopListening();
      });
    } else {
      // Import AutoSyncService here to avoid circular dependency
      import('./AutoSyncService').then(({ AutoSyncService }) => {
        AutoSyncService.startListening();
      });
    }
  }

  static async autoSync(): Promise<{ version: number | null }> {
    const keyId = getKeyId();
    const passphrase = getPassphrase();
    const autoSyncEnabled = getAutoSyncEnabled();

    if (!keyId || !passphrase || !autoSyncEnabled) {
      return { version: null };
    }

    try {
      return await this.pull();
    } catch (error) {
      // Log error but don't throw - auto-sync should be non-intrusive
      Logger.warn('Auto-sync failed:', error);
      return { version: null };
    }
  }
}
