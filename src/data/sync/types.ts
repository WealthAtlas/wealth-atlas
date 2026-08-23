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
  lastRemoteVersion?: number;
  lastSyncAt?: string;
  autoSyncEnabled: boolean;
  hasStoredPassphrase: boolean;
}

export interface RemoteDataResponse<TMeta = unknown> {
  keyId: string;
  version: number;
  payload: string;
  meta: TMeta;
  updatedAt?: string;
}
