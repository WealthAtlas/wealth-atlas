import { newUid } from '@/data/sync/merge/SyncMeta';
import { SYNCED_TABLES } from '@/data/sync/merge/SyncedTables';

/**
 * Schema v12 gives every synced row the two columns a merge needs — `uid` and
 * `updatedAt` — and adds the `deletions` table that lets a deletion travel.
 *
 * The stamping has to happen for existing rows: a row with no uid cannot be
 * matched against the same row on another device, and a row with no `updatedAt`
 * loses every tiebreak. Both halves are here for the usual reason — a device
 * upgrades its own store through `version(12).upgrade`, and a snapshot written
 * by an older build arrives with neither column nor the new table.
 *
 * One consequence worth being plain about, and the reason `SyncService` gates
 * merging behind a shared lineage: uids minted here are *this device's*. Two
 * devices upgrading independently give the same logical asset two different
 * uids, so their first reconciliation cannot be a merge — it would insert each
 * device's rows into the other and double everything. It has to be a replace,
 * after which both sides share one set of uids and every later sync can merge.
 *
 * Idempotent: a row that already has the columns keeps them.
 */

const EPOCH = new Date(0);

/**
 * Stamps one row. `updatedAt` falls back to the epoch rather than now: these
 * rows predate merging, nothing is known about when they were last touched, and
 * dating them "now" would have a freshly-upgraded device outrank every real edit
 * sitting on another one.
 */
export function stampRowToV12(row: Record<string, unknown>): void {
  if (!row.uid) row.uid = newUid();
  if (!row.updatedAt) row.updatedAt = EPOCH;
}

export function upgradeSnapshotDataToV12(data: Record<string, unknown[] | undefined>): void {
  for (const table of SYNCED_TABLES) {
    const rows = data[table.name] as Record<string, unknown>[] | undefined;
    rows?.forEach(stampRowToV12);
  }
  // A snapshot from before v12 records no deletions, and `bulkPut(undefined)` is
  // not `bulkPut([])`.
  data.deletions ??= [];
}
