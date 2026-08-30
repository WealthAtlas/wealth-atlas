import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stored = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => void stored.set(key, value),
  removeItem: (key: string) => void stored.delete(key),
  clear: () => stored.clear(),
});
vi.stubEnv('VITE_SYNC_API_URL', 'https://sync.test');

/**
 * A fake of the sync backend: one encrypted blob per key, behind a version
 * counter, with no ability to merge anything — which is the constraint the whole
 * design is shaped by.
 */
const cloud = new Map<
  string,
  { version: number; payload: string; meta: CryptoMeta; updatedAt: string }
>();
let requests = 0;
let puts = 0;
/**
 * Runs once, inside the gap between a push reading the version and its PUT
 * landing. That gap is the only place the race lives, and it is not reachable
 * from the outside any other way.
 */
let insideThePushGap: (() => void) | undefined;
/**
 * Whether the fake honours `expectedVersion`. Turned off to stand in for a
 * backend that predates the conditional write, or one rolled back to before it.
 */
let backendHonoursExpectedVersion = true;

vi.stubGlobal('fetch', async (url: string, init?: RequestInit) => {
  requests++;
  const path = url.replace('https://sync.test', '');
  const body = init?.body ? JSON.parse(String(init.body)) : undefined;
  const ok = (value: unknown) => ({
    ok: true,
    json: async () => value,
    text: async () => JSON.stringify(value),
  });

  if (path === '/data' && init?.method === 'POST') {
    const keyId = `key-${cloud.size + 1}`;
    cloud.set(keyId, {
      version: 1,
      payload: body.payload,
      meta: body.meta,
      updatedAt: new Date().toISOString(),
    });
    return ok({ keyId, version: 1 });
  }
  const match = /^\/data\/([^/]+)(\/version)?$/.exec(path);
  if (!match) return { ok: false, status: 404, text: async () => 'not found' };
  const keyId = decodeURIComponent(match[1]);
  const entry = cloud.get(keyId);
  if (!entry) return { ok: false, status: 404, text: async () => 'no such key' };

  if (match[2]) return ok({ version: entry.version });
  if (init?.method === 'PUT') {
    puts++;
    if (insideThePushGap) {
      const run = insideThePushGap;
      insideThePushGap = undefined;
      run();
    }
    // The compare-and-swap the real handler now performs in one transaction: a
    // write is accepted only from the version it names. A body without the field
    // is an older client and keeps the original last-writer-wins behaviour.
    if (
      backendHonoursExpectedVersion &&
      body.expectedVersion !== undefined &&
      body.expectedVersion !== cloud.get(keyId)!.version
    ) {
      return {
        ok: false,
        status: 409,
        text: async () => 'version mismatch',
      };
    }
    // Unconditional, exactly like the real backend: it takes no expected
    // version, which is why the compare-and-swap has to happen in the client.
    // The version is the server's, and the client only ever stores what it is
    // handed back — nothing on a device invents one.
    const current = cloud.get(keyId)!;
    const next = {
      version: current.version + 1,
      payload: body.payload,
      meta: body.meta,
      updatedAt: new Date().toISOString(),
    };
    cloud.set(keyId, next);
    return ok({ keyId, version: next.version });
  }
  return ok({
    keyId,
    version: entry.version,
    payload: entry.payload,
    meta: entry.meta,
    updatedAt: entry.updatedAt,
  });
});

import type { Table } from 'dexie';
import { ALL_TABLES, db } from '@/data/database';
import { AssetRepository } from '@/data/repositories/assets/AssetRepository';
import { ExpenseRepository } from '@/data/repositories/expense/ExpenseRepository';
import { AutoSyncService } from '@/data/sync/AutoSyncService';
import { SyncService } from '@/data/sync/Syncer';
import { decryptJson, encryptJson, type CryptoMeta } from '@/data/sync/crypto';
import type { Snapshot } from '@/data/sync/types';
import { SyncConflictError } from '@/data/sync/conflict';
import { ValueModel } from '@/domain/entities/assets/ValueModel';
import type { IAsset } from '@/domain/entities/assets/Asset';
import type { IExpense } from '@/domain/entities/expenses/Expense';

/**
 * The sync feature end to end: two devices, one cloud, the real service.
 *
 * There is one Dexie store in this process, so a "device" is a captured copy of
 * the store *and* the local sync state, swapped in and out. That is exactly what
 * a device is as far as sync is concerned, and it lets the same test drive both
 * sides of a real exchange.
 *
 * The passphrase is real, the encryption is real, and the fake backend is
 * deliberately as dumb as the real one — it cannot decrypt, so it cannot merge,
 * and every decision has to be taken by the client.
 *
 * What is being pinned is the whole shape of the design: a write publishes only
 * if the cloud is still on the version this device is based on, a device pulls
 * before it does anything else, and a genuine divergence is a question the user
 * answers rather than something the app resolves on their behalf.
 */

const PASSPHRASE = 'correct horse battery staple';

interface Device {
  tables: Record<string, unknown[]>;
  state: Map<string, string>;
}

async function captureDevice(): Promise<Device> {
  const tables: Record<string, unknown[]> = {};
  for (const table of ALL_TABLES) tables[table.name] = await table.toArray();
  return { tables, state: new Map(stored) };
}

async function restoreDevice(device: Device): Promise<void> {
  // Suppressed, or the `bulkAdd` arms a push of the device being staged. The
  // same trap `BackupService` restores through.
  await AutoSyncService.withoutScheduling(() =>
    db.transaction('rw', ALL_TABLES, async () => {
      for (const table of ALL_TABLES) {
        const store = table as unknown as Table<Record<string, unknown>>;
        await store.clear();
        await store.bulkAdd(device.tables[table.name] as Record<string, unknown>[]);
      }
    })
  );
  stored.clear();
  for (const [key, value] of device.state) stored.set(key, value);
}

function asset(name: string) {
  return {
    name,
    description: '',
    category: 'Gold',
    currency: 'INR',
    valueModel: ValueModel.MARKET_BASED,
    interestRate: undefined,
    maturityDate: undefined,
    maturityAmount: undefined,
    manualValue: 100,
    manualValueUpdatedAt: undefined,
    script: undefined,
    scriptValue: undefined,
    scriptValueUpdatedAt: undefined,
  } as unknown as IAsset;
}

function expense(description: string, amount = 100) {
  return {
    amount,
    currency: 'INR',
    date: new Date('2026-08-01'),
    category: 'Food',
    isEssential: true,
    description,
  } as unknown as IExpense;
}

const assets = new AssetRepository();
const expenses = new ExpenseRepository();

async function assetNames(): Promise<string[]> {
  return (await db.assets.toArray()).map(row => row.name).sort();
}

async function expenseDescriptions(): Promise<string[]> {
  return (await db.expenses.toArray()).map(row => row.description).sort();
}

/** Sets up one device with sync, then returns a second device linked to it. */
async function twoLinkedDevices(): Promise<{ keyId: string; deviceA: Device; deviceB: Device }> {
  await assets.create(asset('Shared gold'));
  const { keyId } = await SyncService.setupSync(PASSPHRASE, true);
  const deviceA = await captureDevice();

  // A second device: empty store, no sync state, then linked to the same key.
  await restoreDevice({
    tables: Object.fromEntries(ALL_TABLES.map(t => [t.name, []])),
    state: new Map(),
  });
  await SyncService.linkSync(keyId, PASSPHRASE, true);
  const deviceB = await captureDevice();

  return { keyId, deviceA, deviceB };
}

beforeEach(async () => {
  cloud.clear();
  requests = 0;
  puts = 0;
  insideThePushGap = undefined;
  backendHonoursExpectedVersion = true;
  stored.clear();
  if (!db.isOpen()) await db.open();
  await db.transaction('rw', ALL_TABLES, async () => {
    for (const table of ALL_TABLES) await table.clear();
  });
});

describe('linking a second device', () => {
  it('gives it the first device data', async () => {
    const { deviceB } = await twoLinkedDevices();
    await restoreDevice(deviceB);
    expect(await assetNames()).toEqual(['Shared gold']);
  });
});

describe('an edit published and picked up', () => {
  it('reaches the other device on its next pull', async () => {
    // The ordinary two-device day, and the whole flow in one test: A writes and
    // publishes under the compare-and-swap, B opens and pulls before doing
    // anything of its own.
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    await expenses.create(expense('A groceries'));
    await SyncService.push(PASSPHRASE);

    await restoreDevice(deviceB);
    await SyncService.pull(PASSPHRASE);

    expect(await expenseDescriptions()).toEqual(['A groceries']);
    expect(SyncService.getStatus().conflict).toBeUndefined();
  });

  it('carries a deletion, because the snapshot simply no longer holds the row', async () => {
    // No tombstone anywhere: a delete travels by not being in the copy that is
    // published. That is the whole reason whole-snapshot replacement needs no
    // record of what was removed.
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    const created = await expenses.create(expense('Doomed'));
    await SyncService.push(PASSPHRASE);

    await restoreDevice(deviceB);
    await SyncService.pull(PASSPHRASE);
    expect(await expenseDescriptions()).toEqual(['Doomed']);
    const withRow = await captureDevice();

    await expenses.delete(created.id!);
    await SyncService.push(PASSPHRASE);

    await restoreDevice(withRow);
    await SyncService.pull(PASSPHRASE);
    expect(await expenseDescriptions()).toEqual([]);
  });

  it('settles an idle pull against the version endpoint alone', async () => {
    await twoLinkedDevices();
    requests = 0;
    await SyncService.pull(PASSPHRASE);
    // One request: the cheap version probe. Nothing changed, so the snapshot is
    // never downloaded.
    expect(requests).toBe(1);
  });
});

describe('the compare-and-swap on push', () => {
  it('refuses to overwrite a cloud that has moved on', async () => {
    // The bug that started all of this: a stale device replacing the cloud with
    // its own copy, and the other device then pulling that over itself.
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceB);
    await expenses.create(expense('B work'));
    await SyncService.push(PASSPHRASE);
    const cloudAfterB = cloud.get(SyncService.getStatus().keyId!)!.version;

    // A is now a version behind and has not seen B's work.
    await restoreDevice(deviceA);
    await expenses.create(expense('A work'));
    await expect(SyncService.push(PASSPHRASE)).rejects.toThrow(SyncConflictError);

    // Nothing was written, and the refusal is recorded rather than swallowed.
    expect(cloud.get(SyncService.getStatus().keyId!)!.version).toBe(cloudAfterB);
    expect(SyncService.getStatus().conflict?.direction).toBe('push');
    expect(await expenseDescriptions()).toEqual(['A work']);
  });

  it('refuses when the cloud is somehow behind the version this device is based on', async () => {
    // The counter is the server's, so it can only go backwards if the blob was
    // replaced by a different one — a recreated key, or a reset backend. Pushing
    // over that would replace a stranger's data on the strength of a number that
    // no longer counts the same thing.
    const { keyId, deviceA } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    await expenses.create(expense('A work'));
    await SyncService.push(PASSPHRASE);

    const entry = cloud.get(keyId)!;
    cloud.set(keyId, { ...entry, version: 1 });

    await expect(SyncService.push(PASSPHRASE)).rejects.toThrow(SyncConflictError);
    await expect(SyncService.pull(PASSPHRASE)).rejects.toThrow(SyncConflictError);
    expect(await expenseDescriptions()).toEqual(['A work']);
  });
});

describe('the pull that runs at startup', () => {
  it('replaces this device without asking when it has published everything it holds', async () => {
    // It has to be silent. Every write publishes under a compare-and-swap, so a
    // device that starts up stale is a device whose next edit is refused —
    // asking here would put a prompt in front of the user on almost every
    // session, for a copy they have no reason to doubt.
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    await expenses.create(expense('A work'));
    await SyncService.push(PASSPHRASE);

    await restoreDevice(deviceB);
    expect(stored.get('sync.pendingChangeSince')).toBeUndefined();
    await SyncService.pull(PASSPHRASE);

    expect(await expenseDescriptions()).toEqual(['A work']);
    expect(SyncService.getStatus().conflict).toBeUndefined();
  });

  it('is refused when this device holds work the cloud has never seen', async () => {
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceB);
    await expenses.create(expense('B work'));
    await SyncService.push(PASSPHRASE);

    await restoreDevice(deviceA);
    await expenses.create(expense('A unpushed'));
    await expect(SyncService.pull(PASSPHRASE)).rejects.toThrow(SyncConflictError);

    // Still here, which is the whole point.
    expect(await expenseDescriptions()).toEqual(['A unpushed']);
    expect(SyncService.getStatus().conflict?.direction).toBe('pull');
  });
});

describe('resolving a conflict', () => {
  /** Puts the two devices in the state a refused push leaves behind. */
  async function diverge(): Promise<{ deviceA: Device; deviceB: Device }> {
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceB);
    await expenses.create(expense('B work'));
    await SyncService.push(PASSPHRASE);
    const divergedB = await captureDevice();

    await restoreDevice(deviceA);
    await expenses.create(expense('A work'));
    await expect(SyncService.push(PASSPHRASE)).rejects.toThrow(SyncConflictError);

    return { deviceA: await captureDevice(), deviceB: divergedB };
  }

  it('keeps this device, overwriting the cloud copy', async () => {
    const { deviceB } = await diverge();

    await SyncService.resolveConflict('keep-local', PASSPHRASE);

    expect(await expenseDescriptions()).toEqual(['A work']);
    expect(SyncService.getStatus().conflict).toBeUndefined();

    // And the other device now takes it, having nothing unpushed of its own.
    await restoreDevice(deviceB);
    await SyncService.pull(PASSPHRASE);
    expect(await expenseDescriptions()).toEqual(['A work']);
  });

  it('takes the cloud copy, discarding this device', async () => {
    await diverge();

    await SyncService.resolveConflict('take-remote', PASSPHRASE);

    expect(await expenseDescriptions()).toEqual(['B work']);
    expect(SyncService.getStatus().conflict).toBeUndefined();
  });

  it('is the only way out: until it is answered, nothing syncs either way', async () => {
    // There is no manual Push or Pull any more, so a conflict that could not be
    // resolved would strand the device for good. This is what stands in for
    // both buttons.
    const { deviceB } = await diverge();

    // The refused push is still refused, and an edit does not retry past it.
    await expenses.create(expense('A more work'));
    await expect(SyncService.push(PASSPHRASE)).rejects.toThrow(SyncConflictError);
    // And the pull is refused too, because this device holds unpushed work.
    await expect(SyncService.pull(PASSPHRASE)).rejects.toThrow(SyncConflictError);

    await SyncService.resolveConflict('keep-local', PASSPHRASE);

    expect(SyncService.getStatus().conflict).toBeUndefined();
    await restoreDevice(deviceB);
    await SyncService.pull(PASSPHRASE);
    expect(await expenseDescriptions()).toEqual(['A more work', 'A work']);
  });
});

describe('two pushes landing in the same moment', () => {
  /**
   * The one hole the compare-and-swap cannot close by itself. `decidePush` reads
   * the version and then writes, and the API accepts every PUT, so a device that
   * writes inside that round trip is taken too — both pushes succeed and the
   * first one is gone from the cloud without either device being told.
   */
  /** Makes another device's push land after this one has read the version. */
  function anotherDevicePushesInTheGap(keyId: string): void {
    insideThePushGap = () => {
      const entry = cloud.get(keyId)!;
      cloud.set(keyId, { ...entry, version: entry.version + 1 });
    };
  }

  it('is refused by the server, so neither copy is silently replaced', async () => {
    const { keyId, deviceA } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    await expenses.create(expense('A work'));
    anotherDevicePushesInTheGap(keyId);

    // The client's own check passed — it read the version before the other
    // device wrote — so this is caught by `expectedVersion` alone.
    await expect(SyncService.push(PASSPHRASE)).rejects.toThrow(SyncConflictError);

    // A question, not a report: nothing was overwritten, so there is nothing to
    // warn about and the user is asked which copy to keep.
    expect(SyncService.getStatus().overwrite).toBeUndefined();
    expect(SyncService.getStatus().conflict?.direction).toBe('push');
  });

  it('is still caught after the fact if the backend stops honouring the condition', async () => {
    // The server's promise is made by a deployment, not by this code. An older
    // backend, or one rolled back, quietly accepts every PUT again — and the
    // version gap is the only thing that would notice.
    const { keyId, deviceA } = await twoLinkedDevices();
    backendHonoursExpectedVersion = false;

    await restoreDevice(deviceA);
    await expenses.create(expense('A work'));
    anotherDevicePushesInTheGap(keyId);

    await SyncService.push(PASSPHRASE);

    // Based on v1, landed as v3: one write happened in between.
    expect(SyncService.getStatus().overwrite).toMatchObject({ baseVersion: 1, resultVersion: 3 });
    // A report, not a stop — this device is in step and keeps syncing.
    expect(SyncService.getStatus().conflict).toBeUndefined();
  });

  it('says nothing about an ordinary push, which lands exactly one step on', async () => {
    const { deviceA } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    await expenses.create(expense('A work'));
    await SyncService.push(PASSPHRASE);

    expect(SyncService.getStatus().overwrite).toBeUndefined();
  });

  it('says nothing when the user forces a push to resolve a conflict', async () => {
    // A forced push is expected not to line up — that is the user deliberately
    // choosing this device — so reporting it would cry wolf every time.
    const { deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceB);
    await expenses.create(expense('B work'));
    await SyncService.push(PASSPHRASE);

    await restoreDevice(deviceB);
    await SyncService.resolveConflict('keep-local', PASSPHRASE);
    expect(SyncService.getStatus().overwrite).toBeUndefined();
  });
});

describe('the conflict card', () => {
  it('carries when the cloud copy was last saved, which is what picks a copy', async () => {
    // A version number never answered "which of these is the newer one".
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceB);
    await expenses.create(expense('B work'));
    await SyncService.push(PASSPHRASE);

    await restoreDevice(deviceA);
    await expenses.create(expense('A work'));
    await expect(SyncService.push(PASSPHRASE)).rejects.toThrow(SyncConflictError);

    const savedAt = SyncService.getStatus().conflict?.remoteUpdatedAt;
    expect(savedAt).toBeDefined();
    expect(Number.isNaN(new Date(savedAt!).getTime())).toBe(false);
  });
});

describe('saving a record without editing it', () => {
  it('arms no push, so an idle device does not make every other one stale', async () => {
    // A dialog hands back the row it was given, so Save fires the update hooks
    // with no change in them. Published, that write would bump the cloud version
    // for nothing — and every other device's next edit would then be refused.
    const { deviceA } = await twoLinkedDevices();
    await restoreDevice(deviceA);
    const [row] = await db.assets.toArray();

    stored.delete('sync.pendingChangeSince');
    puts = 0;
    await assets.update({ ...row });

    expect(stored.get('sync.pendingChangeSince')).toBeUndefined();
    expect(puts).toBe(0);
  });
});

describe('a snapshot from a build that is not this one', () => {
  /** Rewrites the cloud blob at a given schema version, as another build would. */
  async function republishAt(keyId: string, schemaVersion: number): Promise<void> {
    const entry = cloud.get(keyId)!;
    const current = await decryptJson<Snapshot>(entry.payload, entry.meta, PASSPHRASE);
    const rewritten = { ...current, schemaVersion } as unknown as Snapshot;
    const { payload, meta } = await encryptJson(rewritten, PASSPHRASE, schemaVersion);
    cloud.set(keyId, {
      version: entry.version + 1,
      payload,
      meta,
      updatedAt: new Date().toISOString(),
    });
  }

  it('is imported as it stands when it is older, because nothing in it is unknown', async () => {
    // A v17 cloud is what a device finds on the first launch after this change.
    // There is no upgrade step for it and it does not need one: the columns v17
    // carried are ones nothing reads any more.
    const { keyId, deviceA } = await twoLinkedDevices();
    await republishAt(keyId, 17);

    await restoreDevice(deviceA);
    await SyncService.pull(PASSPHRASE);

    expect(await assetNames()).toEqual(['Shared gold']);
    expect(SyncService.getStatus().conflict).toBeUndefined();
  });

  it('is refused when it is newer, rather than silently truncated on the way back', async () => {
    // The asymmetry that matters. Importing a shape this build has no field for
    // would drop what it cannot name, and the very next push would write the
    // truncated copy back over the cloud.
    const { keyId, deviceA } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    await expenses.create(expense('Only on A'));
    await SyncService.push(PASSPHRASE);

    await republishAt(keyId, 99);

    await expect(SyncService.pull(PASSPHRASE)).rejects.toThrow(/newer version/);
    // Nothing here was touched, which is the point of refusing.
    expect(await expenseDescriptions()).toEqual(['Only on A']);
  });
});
