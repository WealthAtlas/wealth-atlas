import { describe, expect, it } from 'vitest';
import {
  buildIdMap,
  identityOf,
  mergeTable,
  pruneTombstones,
  remapForeignKeys,
  Tombstone,
  TOMBSTONE_RETENTION_DAYS,
} from './MergeRows';
import { syncedTable } from './SyncedTables';

/**
 * The rule that decides whether an edit still exists tomorrow. Every case here
 * is one that whole-snapshot replacement got wrong by deleting a database.
 */
const assets = syncedTable('assets');
const NOW = new Date('2026-08-24T12:00:00Z').getTime();

function asset(uid: string, at: string, extra: Record<string, unknown> = {}) {
  return { uid, updatedAt: new Date(at), name: uid, ...extra };
}

function tomb(key: string, at: string): Tombstone {
  return { table: 'assets', key, deletedAt: new Date(at) };
}

function merge(input: {
  local?: ReturnType<typeof asset>[];
  incoming?: ReturnType<typeof asset>[];
  localTombstones?: Tombstone[];
  incomingTombstones?: Tombstone[];
}) {
  return mergeTable({
    table: assets,
    local: input.local ?? [],
    incoming: input.incoming ?? [],
    localTombstones: input.localTombstones ?? [],
    incomingTombstones: input.incomingTombstones ?? [],
    now: NOW,
  });
}

describe('merging rows neither device has touched twice', () => {
  it('keeps a row only this device has, and owes it to the cloud', () => {
    const mine = asset('a', '2026-08-01T00:00:00Z');
    const plan = merge({ local: [mine] });
    expect(plan.localWins).toEqual([mine]);
    expect(plan.writes).toEqual([]);
    expect(plan.removals).toEqual([]);
    expect(plan.localAhead).toBe(true);
  });

  it('takes a row only the cloud has', () => {
    const theirs = asset('b', '2026-08-01T00:00:00Z');
    const plan = merge({ incoming: [theirs] });
    expect(plan.writes).toEqual([{ incoming: theirs }]);
    expect(plan.localAhead).toBe(false);
  });

  it('keeps both sides when they added different rows', () => {
    // The case the old sync could not survive: two devices, one edit each, and
    // one of them silently discarded.
    const mine = asset('a', '2026-08-01T00:00:00Z');
    const theirs = asset('b', '2026-08-02T00:00:00Z');
    const plan = merge({ local: [mine], incoming: [theirs] });
    expect(plan.localWins).toEqual([mine]);
    expect(plan.writes).toEqual([{ incoming: theirs }]);
    expect(plan.removals).toEqual([]);
  });
});

describe('merging a row both devices changed', () => {
  it('takes the later change', () => {
    const mine = { ...asset('a', '2026-08-01T00:00:00Z'), id: 4 };
    const theirs = asset('a', '2026-08-03T00:00:00Z');
    const plan = merge({ local: [mine], incoming: [theirs] });
    // Written over the local row rather than beside it, so this device's id —
    // and everything pointing at it — survives.
    expect(plan.writes).toEqual([{ incoming: theirs, localId: 4 }]);
    expect(plan.localAhead).toBe(false);
  });

  it('keeps the local change when it is the later one', () => {
    const mine = asset('a', '2026-08-05T00:00:00Z');
    const theirs = asset('a', '2026-08-03T00:00:00Z');
    const plan = merge({ local: [mine], incoming: [theirs] });
    expect(plan.localWins).toEqual([mine]);
    expect(plan.writes).toEqual([]);
    expect(plan.localAhead).toBe(true);
  });

  it('keeps the local row on an exact tie, so the outcome is not a coin toss', () => {
    const plan = merge({
      local: [asset('a', '2026-08-03T00:00:00Z')],
      incoming: [asset('a', '2026-08-03T00:00:00Z')],
    });
    expect(plan.writes).toEqual([]);
    expect(plan.localWins).toHaveLength(1);
  });

  it('treats a row with no timestamp as older than any dated one', () => {
    const undated = { uid: 'a', name: 'a' } as unknown as ReturnType<typeof asset>;
    const dated = asset('a', '2026-01-01T00:00:00Z');
    expect(merge({ local: [undated], incoming: [dated] }).writes).toHaveLength(1);
  });
});

describe('merging a delete against an edit', () => {
  it('removes a local row the cloud deleted more recently', () => {
    const mine = asset('a', '2026-08-01T00:00:00Z');
    const plan = merge({ local: [mine], incomingTombstones: [tomb('a', '2026-08-02T00:00:00Z')] });
    expect(plan.removals).toEqual([mine]);
    expect(plan.localAhead).toBe(false);
  });

  it('keeps a local row edited after the cloud deleted it', () => {
    // The delete is not privileged: it is an event with a time, and the edit is
    // the later word.
    const mine = asset('a', '2026-08-05T00:00:00Z');
    const plan = merge({ local: [mine], incomingTombstones: [tomb('a', '2026-08-02T00:00:00Z')] });
    expect(plan.localWins).toEqual([mine]);
    expect(plan.removals).toEqual([]);
    expect(plan.localAhead).toBe(true);
  });

  it('owes the cloud a deletion this device made', () => {
    const theirs = asset('a', '2026-08-01T00:00:00Z');
    const plan = merge({
      incoming: [theirs],
      localTombstones: [tomb('a', '2026-08-02T00:00:00Z')],
    });
    expect(plan.writes).toEqual([]);
    expect(plan.localAhead).toBe(true);
  });

  it('restores a row the cloud re-created after this device deleted it', () => {
    const theirs = asset('a', '2026-08-05T00:00:00Z');
    const plan = merge({
      incoming: [theirs],
      localTombstones: [tomb('a', '2026-08-02T00:00:00Z')],
    });
    expect(plan.writes).toEqual([{ incoming: theirs }]);
  });

  it('is not owed anything when both devices deleted the same row', () => {
    // Otherwise a device carrying old tombstones would push for ever.
    const plan = merge({
      localTombstones: [tomb('a', '2026-08-02T00:00:00Z')],
      incomingTombstones: [tomb('a', '2026-08-02T00:00:00Z')],
    });
    expect(plan.localAhead).toBe(false);
    expect(plan.writes).toEqual([]);
    expect(plan.removals).toEqual([]);
  });

  it('keeps a row re-created in the same millisecond as its deletion', () => {
    const mine = asset('a', '2026-08-02T00:00:00Z');
    const plan = merge({ local: [mine], incomingTombstones: [tomb('a', '2026-08-02T00:00:00Z')] });
    expect(plan.localWins).toEqual([mine]);
  });
});

describe('tombstones', () => {
  it('keeps the union of both devices, so a delete reaches the third one', () => {
    const plan = merge({
      localTombstones: [tomb('a', '2026-08-01T00:00:00Z')],
      incomingTombstones: [tomb('b', '2026-08-02T00:00:00Z')],
    });
    expect(plan.tombstones.map(t => t.key).sort()).toEqual(['a', 'b']);
  });

  it('keeps the later of two records of the same deletion', () => {
    const plan = merge({
      localTombstones: [tomb('a', '2026-08-01T00:00:00Z')],
      incomingTombstones: [tomb('a', '2026-08-04T00:00:00Z')],
    });
    expect(plan.tombstones).toEqual([tomb('a', '2026-08-04T00:00:00Z')]);
  });

  it('drops tombstones past the retention window', () => {
    const day = 24 * 60 * 60 * 1000;
    const fresh = { table: 'assets', key: 'a', deletedAt: new Date(NOW - day) };
    const ancient = {
      table: 'assets',
      key: 'b',
      deletedAt: new Date(NOW - (TOMBSTONE_RETENTION_DAYS + 1) * day),
    };
    expect(pruneTombstones([fresh, ancient], NOW)).toEqual([fresh]);
  });
});

describe('identity', () => {
  it('matches the settings singleton by its fixed id, not a uid', () => {
    // Both devices hold one settings row. Matching on uid would have them each
    // insert the other's, and a singleton would stop being one.
    const settings = syncedTable('settings');
    expect(identityOf(settings, { id: 1, uid: 'x' })).toBe('1');
  });

  it('matches a currency rate by its code', () => {
    // `currencyRates` has a unique index on `code`; merging on uid would write
    // two INR rows and abort the transaction.
    expect(identityOf(syncedTable('currencyRates'), { id: 3, uid: 'x', code: 'INR' })).toBe('INR');
  });

  it('ignores a row with no identity rather than guessing one', () => {
    expect(identityOf(assets, { id: 3 })).toBeUndefined();
    const plan = merge({ incoming: [{ name: 'nameless' } as never] });
    expect(plan.writes).toEqual([]);
  });
});

describe("remapping foreign keys into this device's ids", () => {
  const investments = syncedTable('investments');

  it('rewrites a reference to the local id of the same logical parent', () => {
    // Both devices count from 1, so an incoming `assetId: 7` means "the asset
    // that is 7 over there" — a different asset here.
    const idMaps = { assets: new Map([[7, 2]]) };
    const result = remapForeignKeys(investments, { uid: 'i', assetId: 7 }, idMaps);
    expect(result).toEqual({ row: { uid: 'i', assetId: 2 }, orphaned: false });
  });

  it('drops a row whose required parent no longer exists', () => {
    // The other device deleted the asset. A transaction pointing at nothing is
    // not a transaction.
    const result = remapForeignKeys(investments, { uid: 'i', assetId: 7 }, { assets: new Map() });
    expect(result).toEqual({ orphaned: true });
  });

  it('clears an optional reference instead of dropping the row', () => {
    // A transaction outlives the SIP that generated it.
    const idMaps = { assets: new Map([[7, 2]]), sips: new Map() };
    const result = remapForeignKeys(investments, { uid: 'i', assetId: 7, sipId: 9 }, idMaps);
    expect(result).toEqual({ row: { uid: 'i', assetId: 2, sipId: undefined }, orphaned: false });
  });

  it('builds the map from rows both devices know', () => {
    const local = [
      { uid: 'a', id: 2 },
      { uid: 'b', id: 5 },
    ];
    const incoming = [
      { uid: 'a', id: 7 },
      { uid: 'c', id: 8 },
    ];
    expect(buildIdMap(assets, local, incoming)).toEqual(new Map([[7, 2]]));
  });
});
