/**
 * What each synced table needs in order to be merged rather than replaced.
 *
 * Three things vary per table and nothing else does, so they are declared here
 * once instead of being spread through the merge:
 *
 * - **identity**: the field that says "this is the same logical row" on two
 *   devices. `uid` for everything the user creates, because Dexie's `++id`
 *   counters are per-device — device A's asset 7 and device B's asset 7 are
 *   different assets, and merging on `id` would silently fuse them. Two tables
 *   have a real identity of their own and use it: `settings` is a singleton at a
 *   fixed id, and `currencyRates` is keyed by a unique `code`, where merging on
 *   `uid` would try to write two rows for INR and break the `&code` index.
 * - **foreignKeys**: the fields holding another row's *local* id. An incoming
 *   row's ids belong to the device that sent it, so every one is remapped
 *   through the parent's identity on the way in.
 * - **order**: parents before children, so a child's remap always finds its
 *   parent already resolved.
 */

export type SyncedTableName =
  | 'assets'
  | 'sips'
  | 'investments'
  | 'loans'
  | 'emis'
  | 'payments'
  | 'goals'
  | 'allocations'
  | 'expenses'
  | 'settings'
  | 'currencyRates'
  | 'decisions'
  | 'memories';

export interface ForeignKey {
  /** The field on this row holding the referenced row's local id. */
  field: string;
  table: SyncedTableName;
  /**
   * Whether the row is meaningless without it. A transaction whose asset was
   * deleted on another device has nothing left to be a transaction of, and is
   * dropped; an optional reference is simply cleared.
   */
  required: boolean;
}

export interface SyncedTable {
  name: SyncedTableName;
  identity: 'uid' | 'id' | 'code';
  foreignKeys: readonly ForeignKey[];
}

/** Parents first. The merge walks this order and depends on it. */
export const SYNCED_TABLES: readonly SyncedTable[] = [
  { name: 'assets', identity: 'uid', foreignKeys: [] },
  {
    name: 'sips',
    identity: 'uid',
    foreignKeys: [{ field: 'assetId', table: 'assets', required: true }],
  },
  {
    name: 'investments',
    identity: 'uid',
    foreignKeys: [
      { field: 'assetId', table: 'assets', required: true },
      // A transaction outlives the SIP that generated it: the schedule can be
      // deleted while the money it moved stays on the books.
      { field: 'sipId', table: 'sips', required: false },
    ],
  },
  { name: 'loans', identity: 'uid', foreignKeys: [] },
  {
    name: 'emis',
    identity: 'uid',
    foreignKeys: [{ field: 'loanId', table: 'loans', required: true }],
  },
  {
    name: 'payments',
    identity: 'uid',
    foreignKeys: [
      { field: 'loanId', table: 'loans', required: true },
      { field: 'emiId', table: 'emis', required: false },
    ],
  },
  { name: 'goals', identity: 'uid', foreignKeys: [] },
  {
    name: 'allocations',
    identity: 'uid',
    foreignKeys: [
      { field: 'assetId', table: 'assets', required: true },
      { field: 'goalId', table: 'goals', required: true },
    ],
  },
  { name: 'expenses', identity: 'uid', foreignKeys: [] },
  // One row at a fixed id, so it is always "the same row" on both devices and
  // therefore always overlapping: it can only ever be last-write-wins.
  { name: 'settings', identity: 'id', foreignKeys: [] },
  { name: 'currencyRates', identity: 'code', foreignKeys: [] },
  { name: 'decisions', identity: 'uid', foreignKeys: [] },
  { name: 'memories', identity: 'uid', foreignKeys: [] },
];

export function syncedTable(name: SyncedTableName): SyncedTable {
  const table = SYNCED_TABLES.find(candidate => candidate.name === name);
  if (!table) throw new Error(`Unknown synced table: ${name}`);
  return table;
}
