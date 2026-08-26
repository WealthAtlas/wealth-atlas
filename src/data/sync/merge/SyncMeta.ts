import type { MergeableRow } from './MergeRows';
import type { SyncedTableName } from './SyncedTables';

/**
 * The two columns every synced row carries so it can be merged instead of
 * replaced, and the one place they are maintained.
 *
 * Deliberately absent from the domain interfaces. `IAsset` describes an asset;
 * when it was last written and what a second device calls it are facts about
 * *syncing* an asset, and putting them on the entity would have every `Asset`
 * class, form and validator carry two fields that mean nothing to the domain.
 * The tables are typed to allow them, the hooks in `database.ts` keep them true,
 * and nothing above the data layer needs to know.
 */
export interface SyncMeta {
  /**
   * The same logical row on every device. Needed because Dexie's `++id` counters
   * are per-device: two devices editing offline both mint asset `7`, for
   * different assets.
   */
  uid: string;
  /** When this device last changed the row. The tiebreak when both did. */
  updatedAt: Date;
}

/** A row as stored: its own fields, plus sync metadata once it has been written. */
export type Synced<T> = T & Partial<SyncMeta>;

export function newUid(): string {
  const source = globalThis.crypto;
  if (source && typeof source.randomUUID === 'function') return source.randomUUID();
  if (source && typeof source.getRandomValues === 'function') {
    const bytes = source.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  }
  // Only reachable without Web Crypto at all. A collision here would fuse two
  // unrelated rows on a merge, so the timestamp prefix keeps two devices apart
  // even if their random source is poor.
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

/**
 * Stamps a row being created. Mutates, because that is what Dexie's `creating`
 * hook offers.
 *
 * `automatic` marks a write that is not the user changing their mind — a startup
 * SIP conversion, a script value refresh, a migration. Those still need a uid,
 * but must not claim to be the latest change: bumping `updatedAt` on every
 * launch would let an automated refresh outrank a real edit made on another
 * device an hour earlier and quietly overwrite it.
 */
export function stampOnCreate(row: MergeableRow, automatic: boolean): void {
  if (!row.uid) row.uid = newUid();
  if (!automatic || !row.updatedAt) row.updatedAt = new Date();
}

/** The two columns that are *about* a write rather than part of it. */
const SYNC_META_FIELDS = new Set(['uid', 'updatedAt']);

function sameValue(next: unknown, current: unknown): boolean {
  if (next === current) return true;
  if (next instanceof Date && current instanceof Date) return next.getTime() === current.getTime();
  if (next === null || current === null) return false;
  if (typeof next !== 'object' || typeof current !== 'object') return false;
  // Settings blocks and allocation arrays are written whole, so a re-save of an
  // identical one is still a re-save of nothing.
  return JSON.stringify(next) === JSON.stringify(current);
}

/**
 * Whether a write leaves the row exactly as it found it.
 *
 * Saving a form without editing anything is a write: the dialog hands back the
 * row it was given, Dexie fires the hooks, and the row used to come out re-dated
 * with a push armed behind it. That is how a device holding *older* data comes to
 * outrank a newer edit on another device — merely opening a record and pressing
 * Save makes this copy "the latest change", and last-write-wins then does exactly
 * what it is told. No edit, and the other device's real work is gone.
 *
 * So a write that changes nothing must claim nothing: no new `updatedAt`, and no
 * push. `uid` and `updatedAt` are excluded from the comparison because they are
 * the bookkeeping being decided, not the content being judged.
 */
export function isNoOpUpdate(
  modifications: Record<string, unknown>,
  existing: MergeableRow | undefined
): boolean {
  if (!existing) return false;
  const keys = Object.keys(modifications).filter(field => !SYNC_META_FIELDS.has(field));
  return keys.every(key => sameValue(modifications[key], existing[key]));
}

/**
 * The extra modifications a write needs, for Dexie's `updating` hook.
 *
 * `put` replaces a whole row, and the domain object handed to it has no `uid` —
 * it is not on the interface. Restoring it from the stored row is what stops a
 * re-saved asset from looking like a brand new one to the next merge, which
 * would duplicate it on every device.
 */
export function stampOnUpdate(
  modifications: Record<string, unknown>,
  existing: MergeableRow | undefined,
  automatic: boolean
): Record<string, unknown> {
  const extra: Record<string, unknown> = {};
  if (modifications.uid === undefined) extra.uid = existing?.uid ?? newUid();
  // A write that changed nothing is not the latest change, whoever made it.
  if (!automatic && !isNoOpUpdate(modifications, existing)) extra.updatedAt = new Date();
  return extra;
}

/**
 * A row that was deleted, kept so the deletion can travel.
 *
 * Without these a merge is a union, and a delete is undone by any device that
 * has not heard about it yet: it still holds the row, so the next merge hands it
 * back. "It came back on its own" is a worse bug than the one merging fixes,
 * because the user cannot tell that it happened.
 */
export interface IDeletion {
  id?: number;
  table: SyncedTableName;
  /** The identity value of the deleted row — a uid, an id, a code. */
  key: string;
  deletedAt: Date;
}
