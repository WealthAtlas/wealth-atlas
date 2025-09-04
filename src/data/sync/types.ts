export interface Snapshot {
  schemaVersion: number;
  data: {
    assets: unknown[];
    assetTransactions: unknown[];
    scheduledAssetTransactions: unknown[];
    expenses: unknown[];
    loans: unknown[];
    paymentSchedules: unknown[];
    loanPayments: unknown[];
    goals: unknown[];
    assetGoalAllocations: unknown[];
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
