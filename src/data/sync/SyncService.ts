import type { IAsset } from '@/domain/entities/assets/Asset';
import type { IAssetTransaction } from '@/domain/entities/assets/AssetTransaction';
import type { IScheduledAssetTransaction } from '@/domain/entities/assets/ScheduledAssetTransaction';
import type { IExpense } from '@/domain/entities/expenses/Expense';
import type { IScheduledExpense } from '@/domain/entities/expenses/ScheduledExpense';
import type { IAssetGoalAllocation } from '@/domain/entities/goals/AssetGoalAllocation';
import type { IGoal } from '@/domain/entities/goals/Goal';
import type { ILoan } from '@/domain/entities/loans/Loan';
import type { ILoanPayment } from '@/domain/entities/loans/LoanPayment';
import type { IPaymentSchedule } from '@/domain/entities/loans/PaymentSchedule';
import { db } from '../../data/database';
import { buildSyncApiUrl } from './config';
import { CryptoMeta, decryptJson, encryptJson } from './crypto';
import {
  getKeyId,
  getLastRemoteVersion,
  getLastSyncAt,
  setKeyId,
  setLastRemoteVersion,
  setLastSyncAt,
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
  // Keep in sync with Dexie latest version (currently 7)
  return 7;
}

async function exportSnapshot(): Promise<Snapshot> {
  const [
    assets,
    assetTransactions,
    scheduledAssetTransactions,
    expenses,
    scheduledExpenses,
    loans,
    paymentSchedules,
    loanPayments,
    goals,
    assetGoalAllocations,
  ] = await Promise.all([
    db.assets.toArray(),
    db.assetTransactions.toArray(),
    db.scheduledAssetTransactions.toArray(),
    db.expenses.toArray(),
    db.scheduledExpenses.toArray(),
    db.loans.toArray(),
    db.paymentSchedules.toArray(),
    db.loanPayments.toArray(),
    db.goals.toArray(),
    db.assetGoalAllocations.toArray(),
  ]);
  return {
    schemaVersion: getSchemaVersion(),
    data: {
      assets,
      assetTransactions,
      scheduledAssetTransactions,
      expenses,
      scheduledExpenses,
      loans,
      paymentSchedules,
      loanPayments,
      goals,
      assetGoalAllocations,
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
      db.assetTransactions,
      db.scheduledAssetTransactions,
      db.expenses,
      db.scheduledExpenses,
      db.loans,
      db.paymentSchedules,
      db.loanPayments,
      db.goals,
      db.assetGoalAllocations,
    ],
    async () => {
      await Promise.all([
        db.assetGoalAllocations.clear(),
        db.goals.clear(),
        db.loanPayments.clear(),
        db.paymentSchedules.clear(),
        db.loans.clear(),
        db.scheduledExpenses.clear(),
        db.expenses.clear(),
        db.scheduledAssetTransactions.clear(),
        db.assetTransactions.clear(),
        db.assets.clear(),
      ]);
      const d = snapshot.data as {
        assets?: IAsset[];
        assetTransactions?: IAssetTransaction[];
        scheduledAssetTransactions?: IScheduledAssetTransaction[];
        expenses?: IExpense[];
        scheduledExpenses?: IScheduledExpense[];
        loans?: ILoan[];
        paymentSchedules?: IPaymentSchedule[];
        loanPayments?: ILoanPayment[];
        goals?: IGoal[];
        assetGoalAllocations?: IAssetGoalAllocation[];
      };
      // Order respects dependencies
      await db.assets.bulkPut(d.assets || []);
      await db.assetTransactions.bulkPut(d.assetTransactions || []);
      await db.scheduledAssetTransactions.bulkPut(d.scheduledAssetTransactions || []);
      await db.expenses.bulkPut(d.expenses || []);
      await db.scheduledExpenses.bulkPut(d.scheduledExpenses || []);
      await db.loans.bulkPut(d.loans || []);
      await db.paymentSchedules.bulkPut(d.paymentSchedules || []);
      await db.loanPayments.bulkPut(d.loanPayments || []);
      await db.goals.bulkPut(d.goals || []);
      await db.assetGoalAllocations.bulkPut(d.assetGoalAllocations || []);
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
    };
  }

  static async setupSync(passphrase: string): Promise<{ keyId: string; version: number }> {
    const snapshot = await exportSnapshot();
    const { payload, meta } = await encryptJson(snapshot, passphrase, snapshot.schemaVersion);
    const resp = await api<RemoteDataResponse<CryptoMeta>>('/data', {
      method: 'POST',
      body: JSON.stringify({ payload, meta }),
    });
    setKeyId(resp.keyId);
    setLastRemoteVersion(resp.version);
    setLastSyncAt(new Date().toISOString());
    return { keyId: resp.keyId, version: resp.version };
  }

  static async linkSync(keyId: string, passphrase: string): Promise<void> {
    const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);
    const snapshot = await decryptJson<Snapshot>(resp.payload, resp.meta, passphrase);
    await importSnapshot(snapshot);
    setKeyId(resp.keyId);
    setLastRemoteVersion(resp.version);
    setLastSyncAt(new Date().toISOString());
  }

  static async pull(passphrase: string): Promise<{ version: number | null }> {
    const keyId = getKeyId();
    if (!keyId) throw new Error('Sync not set up');
    const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`);
    const last = getLastRemoteVersion() ?? 0;
    if (resp.version <= last) return { version: null };
    const snapshot = await decryptJson<Snapshot>(resp.payload, resp.meta, passphrase);
    await importSnapshot(snapshot);
    setLastRemoteVersion(resp.version);
    setLastSyncAt(new Date().toISOString());
    return { version: resp.version };
  }

  static async push(passphrase: string): Promise<{ version: number }> {
    const keyId = getKeyId();
    if (!keyId) throw new Error('Sync not set up');
    const snapshot = await exportSnapshot();
    const { payload, meta } = await encryptJson(snapshot, passphrase, snapshot.schemaVersion);
    const resp = await api<RemoteDataResponse<CryptoMeta>>(`/data/${encodeURIComponent(keyId)}`, {
      method: 'PUT',
      body: JSON.stringify({ payload, meta }),
    });
    setLastRemoteVersion(resp.version);
    setLastSyncAt(new Date().toISOString());
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
  }

  static async unlink(): Promise<void> {
    setKeyId(undefined);
    setLastRemoteVersion(undefined);
    setLastSyncAt(undefined);
  }
}
