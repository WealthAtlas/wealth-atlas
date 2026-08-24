import type { SyncConflict } from './conflict';

export interface Snapshot {
  schemaVersion: number;
  /**
   * Which set of row uids this snapshot's rows belong to.
   *
   * Merging two devices' rows is only meaningful if both call the same logical
   * row by the same uid, and uids are minted per device: two devices that
   * upgraded independently, or one that overwrote the other wholesale, are in
   * different uid spaces, and merging across them would insert each device's
   * rows into the other and double everything.
   *
   * So a device merges only against the lineage it last adopted. A new one is
   * minted by whoever declares their rows canonical — the device that sets sync
   * up, or one that resolves a conflict in its own favour — and everyone else
   * falls back to replacing rather than merging until they have adopted it.
   * Absent on snapshots written before merging existed.
   */
  lineage?: string;
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
    /** Tombstones, so a deletion travels instead of being merged away. */
    deletions: unknown[];
  };
}

export interface SyncStatus {
  enabled: boolean;
  keyId?: string;
  lastRemoteVersion?: number;
  lastSyncAt?: string;
  autoSyncEnabled: boolean;
  hasStoredPassphrase: boolean;
  /** When this device first changed something the cloud has not seen. */
  pendingChangeSince?: string;
  /** A refused sync awaiting the user's decision. */
  conflict?: SyncConflict;
}

export interface RemoteDataResponse<TMeta = unknown> {
  keyId: string;
  version: number;
  payload: string;
  meta: TMeta;
  updatedAt?: string;
}
