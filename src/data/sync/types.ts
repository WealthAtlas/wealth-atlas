import type { SyncConflict, SyncOverwrite } from './conflict';

export interface Snapshot {
  schemaVersion: number;
  data: {
    assets: unknown[];
    investments: unknown[];
    sips: unknown[];
    expenses: unknown[];
    loans: unknown[];
    emis: unknown[];
    payments: unknown[];
    goals: unknown[];
    allocations: unknown[];
    settings: unknown[];
    currencyRates: unknown[];
    decisions: unknown[];
    memories: unknown[];
  };
}

export interface SyncStatus {
  enabled: boolean;
  keyId?: string;
  lastSyncAt?: string;
  autoSyncEnabled: boolean;
  /** When this device first changed something the cloud has not seen. */
  pendingChangeSince?: string;
  /** A refused sync awaiting the user's decision. */
  conflict?: SyncConflict;
  /** A push that replaced another device's push. A report, not a question. */
  overwrite?: SyncOverwrite;
}

export interface RemoteDataResponse<TMeta = unknown> {
  keyId: string;
  version: number;
  payload: string;
  meta: TMeta;
  updatedAt?: string;
}
