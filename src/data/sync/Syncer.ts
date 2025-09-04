import type { IAsset } from '@/domain/entities/assets/Asset';
import type { IInvestment } from '@/domain/entities/assets/Investment';
import type { ISIP } from '@/domain/entities/assets/SIP';
import type { IExpense } from '@/domain/entities/expenses/Expense';
import type { IAllocation } from '@/domain/entities/goals/Allocation';
import type { IGoal } from '@/domain/entities/goals/Goal';
import type { IEMI } from '@/domain/entities/loans/EMI';
import type { ILoan } from '@/domain/entities/loans/Loan';
import type { IPayment } from '@/domain/entities/loans/Payment';
import { Logger } from '@/domain/utils/Logger';
import { db } from '../database';
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

// Simple fetch wrapper with configurable API base URL
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const url = buildSyncApiUrl(path);
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

function getSchemaVersion(): number {
  // Keep in sync with Dexie latest version (currently 8)
  return 8;
}

async function exportSnapshot(): Promise<Snapshot> {
  const [assets, investments, sips, expenses, loans, emis, payments, goals, allocations] =
    await Promise.all([
      db.assets.toArray(),
      db.investments.toArray(),
      db.sips.toArray(),
      db.expenses.toArray(),
      db.loans.toArray(),
      db.emis.toArray(),
      db.payments.toArray(),
      db.goals.toArray(),
      db.allocations.toArray(),
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
    },
  };
}

async function importSnapshot(snapshot: Snapshot): Promise<void> {
  if (snapshot.schemaVersion !== getSchemaVersion()) {
    throw new Error(
      `Schema mismatch. Remote=${snapshot.schemaVersion}, Local=${getSchemaVersion()}`
    );
  }
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
    ],
    async () => {
      await Promise.all([
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

    const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);
    const last = getLastRemoteVersion() ?? 0;
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
