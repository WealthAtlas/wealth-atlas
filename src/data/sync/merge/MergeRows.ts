import type { SyncedTable } from './SyncedTables';

/**
 * The merge itself: which of two devices' versions of a row survives.
 *
 * Pure, and deliberately the only place the rule lives. Everything around it —
 * transactions, id remapping, snapshots — is plumbing that can be read; this is
 * the part that decides whether a user's edit exists tomorrow.
 *
 * Two rules, and they are the user's own words for them:
 *
 * - **Not overlapping: keep both.** A row only one side has is kept, whichever
 *   side that is. This is the common case — two devices adding different
 *   expenses — and it is the whole reason merging exists: whole-snapshot
 *   replacement had to discard one of them.
 * - **Overlapping: latest change wins.** Both sides edited the same row, so
 *   there is no answer to derive, only a policy, and the later `updatedAt` is
 *   it. Row-level, not field-level: per-field stamps would let two edits to
 *   different fields of one asset both survive, at the cost of a timestamp per
 *   column on every table. That trade is not obviously worth it and would be
 *   invisible to the user, whose edits to *one* record moments apart are the
 *   rarest case here.
 *
 * A delete is an event with a time like any other, which is what makes
 * delete-versus-edit fall out of the same comparison rather than needing a rule
 * of its own: a tombstone newer than the incoming row removes it, and an edit
 * newer than the tombstone brings it back.
 */

export interface Tombstone {
  table: string;
  /** The identity value of the row that was deleted — a uid, an id, a code. */
  key: string;
  deletedAt: Date;
}

/** The shape the merge needs; every synced row has these beside its own fields. */
export interface MergeableRow {
  id?: number;
  uid?: string;
  updatedAt?: Date;
  [field: string]: unknown;
}

export interface MergeWrite<T> {
  /** The incoming row, to be written locally. */
  incoming: T;
  /** The local row it replaces, so its local id and children survive. */
  localId?: number;
}

export interface TableMergePlan<T> {
  /** Incoming rows that won, or that only the cloud has. */
  writes: MergeWrite<T>[];
  /** Local rows the cloud deleted more recently than this device changed them. */
  removals: T[];
  /** Local rows that won, or that only this device has. Nothing to write. */
  localWins: T[];
  /** The tombstones this device should hold after merging, pruned. */
  tombstones: Tombstone[];
  /**
   * Whether the merged result differs from what the cloud holds — i.e. whether
   * a push is owed. Deliberately false for a tombstone the cloud already agrees
   * with, or a device with old tombstones would push for ever.
   */
  localAhead: boolean;
}

/**
 * How long a tombstone is kept.
 *
 * A tombstone can only be dropped once every device has seen it, and there is no
 * way to know that: the devices are anonymous to each other. So this is a
 * judgement, not a derivation — long enough that a device off for a season still
 * learns about the delete, short enough that the list does not grow for ever.
 * Past it, a very stale device could resurrect a deleted row; that is the stated
 * cost of not keeping deletions for all time.
 */
export const TOMBSTONE_RETENTION_DAYS = 180;

function timeOf(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (typeof value === 'string' || typeof value === 'number') {
    const parsed = new Date(value).getTime();
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

/** The identity value of a row, as a string, or undefined when it has none. */
export function identityOf(table: SyncedTable, row: MergeableRow): string | undefined {
  const value = row[table.identity];
  if (value === undefined || value === null || value === '') return undefined;
  return String(value);
}

type Side<T> =
  { kind: 'alive'; row: T; at: number } | { kind: 'deleted'; at: number } | { kind: 'absent' };

/**
 * What one side last did to a key. A row and a tombstone can both exist — the
 * row was re-created after the delete, or the delete came after the row was last
 * touched — so the later of the two is what that side is saying.
 */
function sideOf<T extends MergeableRow>(row: T | undefined, tomb: Tombstone | undefined): Side<T> {
  const rowAt = row ? timeOf(row.updatedAt) : -1;
  const tombAt = tomb ? timeOf(tomb.deletedAt) : -1;
  // On a tie the row wins: a delete and a re-add in the same millisecond is
  // more usefully read as "it exists".
  if (row && rowAt >= tombAt) return { kind: 'alive', row, at: rowAt };
  if (tomb) return { kind: 'deleted', at: tombAt };
  return { kind: 'absent' };
}

function byKey<T extends MergeableRow>(table: SyncedTable, rows: readonly T[]): Map<string, T> {
  const map = new Map<string, T>();
  for (const row of rows) {
    const key = identityOf(table, row);
    // A row with no identity cannot be matched across devices. It is left out
    // rather than guessed at; `stampSyncMeta` is what stops them existing.
    if (key !== undefined) map.set(key, row);
  }
  return map;
}

function tombstonesByKey(tombstones: readonly Tombstone[]): Map<string, Tombstone> {
  const map = new Map<string, Tombstone>();
  for (const tomb of tombstones) {
    const existing = map.get(tomb.key);
    if (!existing || timeOf(tomb.deletedAt) > timeOf(existing.deletedAt)) map.set(tomb.key, tomb);
  }
  return map;
}

/** Drops tombstones past the retention window. `now` is injected for testing. */
export function pruneTombstones(tombstones: readonly Tombstone[], now: number): Tombstone[] {
  const horizon = now - TOMBSTONE_RETENTION_DAYS * 24 * 60 * 60 * 1000;
  return tombstones.filter(tomb => timeOf(tomb.deletedAt) >= horizon);
}

export function mergeTable<T extends MergeableRow>(input: {
  table: SyncedTable;
  local: readonly T[];
  incoming: readonly T[];
  localTombstones: readonly Tombstone[];
  incomingTombstones: readonly Tombstone[];
  now: number;
}): TableMergePlan<T> {
  const localRows = byKey(input.table, input.local);
  const incomingRows = byKey(input.table, input.incoming);
  const localTombs = tombstonesByKey(input.localTombstones);
  const incomingTombs = tombstonesByKey(input.incomingTombstones);

  const plan: TableMergePlan<T> = {
    writes: [],
    removals: [],
    localWins: [],
    tombstones: [],
    localAhead: false,
  };

  const keys = new Set([
    ...localRows.keys(),
    ...incomingRows.keys(),
    ...localTombs.keys(),
    ...incomingTombs.keys(),
  ]);

  for (const key of keys) {
    const local = sideOf(localRows.get(key), localTombs.get(key));
    const incoming = sideOf(incomingRows.get(key), incomingTombs.get(key));

    if (local.kind === 'alive' && incoming.kind === 'alive') {
      // Overlapping. The later change wins; a tie keeps the local row so the
      // outcome does not depend on which device asked.
      if (incoming.at > local.at) {
        plan.writes.push({ incoming: incoming.row, localId: local.row.id });
      } else {
        plan.localWins.push(local.row);
        // Only a *strictly* later local change is something the cloud has not
        // seen. An equal stamp is the same write on both sides, which is the
        // ordinary state of every row the moment a merge finishes — counting it
        // as ahead had each device push back the snapshot it had just merged,
        // and the other then merge and push that, for ever.
        if (local.at > incoming.at) plan.localAhead = true;
      }
      continue;
    }

    if (local.kind === 'alive' && incoming.kind === 'deleted') {
      if (incoming.at > local.at) plan.removals.push(local.row);
      else {
        // Edited here after being deleted there: the edit is the later word, so
        // the row comes back and the cloud has to be told.
        plan.localWins.push(local.row);
        plan.localAhead = true;
      }
      continue;
    }

    if (local.kind === 'alive' && incoming.kind === 'absent') {
      // Not overlapping: only this device has it. Kept, and owed to the cloud.
      plan.localWins.push(local.row);
      plan.localAhead = true;
      continue;
    }

    if (local.kind === 'deleted' && incoming.kind === 'alive') {
      if (incoming.at > local.at) {
        // Re-created there after being deleted here.
        plan.writes.push({ incoming: incoming.row });
      } else {
        // Deleted here more recently. Nothing to write, but the cloud still
        // holds the row, so the deletion is owed to it.
        plan.localAhead = true;
      }
      continue;
    }

    if (local.kind === 'absent' && incoming.kind === 'alive') {
      // Not overlapping: only the cloud has it. Kept.
      plan.writes.push({ incoming: incoming.row });
      continue;
    }

    // Both deleted, or one deleted and the other never had it: nothing to do,
    // and nothing the cloud needs to hear about.
  }

  plan.tombstones = pruneTombstones(
    [...tombstonesByKey([...input.localTombstones, ...input.incomingTombstones]).values()],
    input.now
  );

  return plan;
}

/**
 * Maps an incoming row's local id to this device's id for the same logical row.
 *
 * The reason foreign keys cannot travel as-is: both devices count from 1, so an
 * incoming `assetId: 7` means "the asset that is 7 over there", which is some
 * other asset here — or none.
 */
export function buildIdMap<T extends MergeableRow>(
  table: SyncedTable,
  local: readonly T[],
  incoming: readonly T[]
): Map<number, number> {
  const localByKey = byKey(table, local);
  const map = new Map<number, number>();
  for (const row of incoming) {
    const key = identityOf(table, row);
    if (key === undefined) continue;
    const match = localByKey.get(key);
    if (match?.id !== undefined && row.id !== undefined) map.set(row.id, match.id);
  }
  return map;
}

export type RemapResult<T> = { row: T; orphaned: false } | { orphaned: true };

/**
 * Rewrites an incoming row's foreign keys into this device's id space.
 *
 * A required reference that resolves to nothing means the parent is gone — the
 * other device deleted the asset this transaction belonged to — and the row is
 * reported as an orphan rather than written pointing at nothing. An optional one
 * is cleared instead, because the row still means something without it.
 */
export function remapForeignKeys<T extends MergeableRow>(
  table: SyncedTable,
  row: T,
  idMaps: Record<string, Map<number, number>>
): RemapResult<T> {
  if (table.foreignKeys.length === 0) return { row, orphaned: false };
  const remapped: MergeableRow = { ...row };
  for (const fk of table.foreignKeys) {
    const current = remapped[fk.field];
    if (current === undefined || current === null) continue;
    const mapped = idMaps[fk.table]?.get(Number(current));
    if (mapped === undefined) {
      if (fk.required) return { orphaned: true };
      remapped[fk.field] = undefined;
      continue;
    }
    remapped[fk.field] = mapped;
  }
  return { row: remapped as T, orphaned: false };
}
