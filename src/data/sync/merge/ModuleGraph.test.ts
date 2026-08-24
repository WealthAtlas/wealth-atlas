import { describe, expect, it, vi } from 'vitest';

const store = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
  clear: () => store.clear(),
});

/**
 * The merge introduced a second cycle through `database.ts`, which already had
 * one: database → AutoSyncService → Syncer → ApplyMerge → database, plus
 * database → Tombstones → database. Cycles like these work only while nothing
 * touches an imported binding during module evaluation, and `database.ts`
 * constructs its Dexie instance at evaluation time.
 *
 * A break here is a blank app on every route — thrown before anything renders,
 * and invisible to `tsc` and to the build, both of which are happy to compile a
 * graph that cannot initialise. So this asserts the one thing neither of them
 * checks: that importing it works at all.
 */
describe('the data layer module graph', () => {
  it('initialises despite the cycle through database.ts', async () => {
    const { ALL_TABLES, tableByName, db } = await import('@/data/database');
    expect(db.assets).toBeDefined();
    // Thirteen entity tables plus `deletions`. Pinned because a whole-database
    // transaction that omits a table makes every write to it throw.
    expect(ALL_TABLES.length).toBe(14);
    expect(tableByName('assets')).toBe(db.assets);
    const { applyMerge } = await import('@/data/sync/merge/ApplyMerge');
    expect(typeof applyMerge).toBe('function');
    const { SyncService } = await import('@/data/sync/Syncer');
    expect(typeof SyncService.reconcile).toBe('function');
    const { deleteSynced } = await import('@/data/sync/merge/Tombstones');
    expect(typeof deleteSynced).toBe('function');
  });
});
