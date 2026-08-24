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
const cloud = new Map<string, { version: number; payload: string; meta: unknown }>();
let requests = 0;

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
    cloud.set(keyId, { version: 1, payload: body.payload, meta: body.meta });
    return ok({ keyId, version: 1 });
  }
  const match = /^\/data\/([^/]+)(\/version)?$/.exec(path);
  if (!match) return { ok: false, status: 404, text: async () => 'not found' };
  const keyId = decodeURIComponent(match[1]);
  const entry = cloud.get(keyId);
  if (!entry) return { ok: false, status: 404, text: async () => 'no such key' };

  if (match[2]) return ok({ version: entry.version });
  if (init?.method === 'PUT') {
    // Unconditional, exactly like the real backend: it takes no expected
    // version, which is why the compare-and-swap has to happen in the client.
    const next = { version: entry.version + 1, payload: body.payload, meta: body.meta };
    cloud.set(keyId, next);
    return ok({ keyId, version: next.version });
  }
  return ok({ keyId, version: entry.version, payload: entry.payload, meta: entry.meta });
});

import type { Table } from 'dexie';
import { ALL_TABLES, db } from '@/data/database';
import { AssetRepository } from '@/data/repositories/assets/AssetRepository';
import { ExpenseRepository } from '@/data/repositories/expense/ExpenseRepository';
import { AutoSyncService } from '@/data/sync/AutoSyncService';
import { SyncService } from '@/data/sync/Syncer';
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
  // Suppressed, or `bulkAdd`'s creating hook re-dates every row to now and the
  // restored device would outrank whatever it is being tested against. The same
  // trap `BackupService` restores through.
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
  stored.clear();
  if (!db.isOpen()) await db.open();
  await db.transaction('rw', ALL_TABLES, async () => {
    for (const table of ALL_TABLES) await table.clear();
  });
});

describe('linking a second device', () => {
  it('gives it the first device data and a lineage it can merge against', async () => {
    const { deviceB } = await twoLinkedDevices();
    await restoreDevice(deviceB);
    expect((await db.assets.toArray()).map(row => row.name)).toEqual(['Shared gold']);
    // Same uids, which is what makes merging meaningful at all.
    expect(stored.get('sync.mergeLineage')).toBeDefined();
  });
});

describe('two devices changing different things', () => {
  it('keeps both edits, with no question asked', async () => {
    // The case the old sync could not survive: one edit each, and one of them
    // silently discarded.
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    await expenses.create(expense('A groceries'));
    await SyncService.reconcile(PASSPHRASE);
    const afterA = await captureDevice();

    await restoreDevice(deviceB);
    await expenses.create(expense('B fuel'));
    await SyncService.reconcile(PASSPHRASE);

    expect(await expenseDescriptions()).toEqual(['A groceries', 'B fuel']);

    // And the first device learns about the second's, from the cloud.
    await restoreDevice(afterA);
    await SyncService.reconcile(PASSPHRASE);
    expect(await expenseDescriptions()).toEqual(['A groceries', 'B fuel']);
  });

  it('leaves both devices and the cloud holding the same thing', async () => {
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    await expenses.create(expense('A one'));
    await SyncService.reconcile(PASSPHRASE);
    const afterA = await captureDevice();

    await restoreDevice(deviceB);
    await expenses.create(expense('B two'));
    await SyncService.reconcile(PASSPHRASE);
    const bDescriptions = await expenseDescriptions();

    await restoreDevice(afterA);
    await SyncService.reconcile(PASSPHRASE);
    // A second reconcile changes nothing: convergence, not oscillation.
    await SyncService.reconcile(PASSPHRASE);
    expect(await expenseDescriptions()).toEqual(bDescriptions);
  });
});

describe('two devices changing the same thing', () => {
  it('keeps the later edit', async () => {
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    const [localA] = await db.assets.toArray();
    await assets.update({ ...localA, name: 'Renamed on A' });
    await SyncService.reconcile(PASSPHRASE);

    await restoreDevice(deviceB);
    const [localB] = await db.assets.toArray();
    // Later by the clock, so this is the one that should stand.
    await new Promise(resolve => setTimeout(resolve, 5));
    await assets.update({ ...localB, name: 'Renamed on B' });
    await SyncService.reconcile(PASSPHRASE);

    const names = (await db.assets.toArray()).map(row => row.name);
    // One row, not two: the same logical asset, recognised across devices.
    expect(names).toEqual(['Renamed on B']);
  });
});

describe('a deletion on one device', () => {
  it('reaches the other', async () => {
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    const created = await expenses.create(expense('Doomed'));
    await SyncService.reconcile(PASSPHRASE);

    await restoreDevice(deviceB);
    await SyncService.reconcile(PASSPHRASE);
    expect(await expenseDescriptions()).toEqual(['Doomed']);
    const withRow = await captureDevice();

    // Deleted on B...
    const [rowOnB] = await db.expenses.toArray();
    await expenses.delete(rowOnB.id!);
    await SyncService.reconcile(PASSPHRASE);

    // ...and gone on A after it syncs, rather than being handed back.
    await restoreDevice(withRow);
    await SyncService.reconcile(PASSPHRASE);
    expect(await expenseDescriptions()).toEqual([]);
    expect(created.id).toBeDefined();
  });

  it('loses to a later edit of the same row on the other device', async () => {
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    await expenses.create(expense('Contested'));
    await SyncService.reconcile(PASSPHRASE);
    await restoreDevice(deviceB);
    await SyncService.reconcile(PASSPHRASE);
    const bHasRow = await captureDevice();

    // Deleted on B first.
    const [onB] = await db.expenses.toArray();
    await expenses.delete(onB.id!);
    await SyncService.reconcile(PASSPHRASE);

    // Then edited on A, later. A delete is an event with a time, not a veto.
    await restoreDevice(bHasRow);
    await new Promise(resolve => setTimeout(resolve, 5));
    const [onA] = await db.expenses.toArray();
    await expenses.update({ ...onA, description: 'Contested, edited' });
    await SyncService.reconcile(PASSPHRASE);

    expect(await expenseDescriptions()).toEqual(['Contested, edited']);
  });
});

describe('the compare-and-swap on push', () => {
  it('refuses to overwrite a cloud that has moved on', async () => {
    // The bug that started all of this: a stale device replacing the cloud with
    // its own copy, and the other device then pulling that over itself.
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceB);
    await expenses.create(expense('B work'));
    await SyncService.reconcile(PASSPHRASE);

    // A is now a version behind and has not seen B's work.
    await restoreDevice(deviceA);
    await expenses.create(expense('A work'));
    await expect(SyncService.push(PASSPHRASE)).rejects.toThrow(SyncConflictError);

    // Nothing was written: B's work is still what the cloud holds.
    const status = SyncService.getStatus();
    expect(status.conflict?.direction).toBe('push');
  });

  it('is not needed by reconcile, which merges instead of refusing', async () => {
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceB);
    await expenses.create(expense('B work'));
    await SyncService.reconcile(PASSPHRASE);

    await restoreDevice(deviceA);
    await expenses.create(expense('A work'));
    await SyncService.reconcile(PASSPHRASE);

    expect(await expenseDescriptions()).toEqual(['A work', 'B work']);
    expect(SyncService.getStatus().conflict).toBeUndefined();
  });
});

describe('a pull that would discard unpushed work', () => {
  it('is refused rather than performed', async () => {
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceB);
    await expenses.create(expense('B work'));
    await SyncService.reconcile(PASSPHRASE);

    await restoreDevice(deviceA);
    await expenses.create(expense('A unpushed'));
    await expect(SyncService.pull(PASSPHRASE)).rejects.toThrow(SyncConflictError);
    // Still here, which is the whole point.
    expect(await expenseDescriptions()).toEqual(['A unpushed']);
  });
});

describe('a snapshot from a different lineage', () => {
  it('is replaced rather than merged, so nothing is duplicated', async () => {
    const { deviceA, deviceB } = await twoLinkedDevices();

    // B declares its own rows canonical, which mints a new lineage.
    await restoreDevice(deviceB);
    await expenses.create(expense('B only'));
    await SyncService.reconcile(PASSPHRASE);
    stored.set(
      'sync.conflict',
      JSON.stringify({ direction: 'push', remoteVersion: 2, detectedAt: '' })
    );
    await SyncService.resolveConflict('keep-local', PASSPHRASE);
    const newLineage = stored.get('sync.mergeLineage');

    // A is still on the old lineage, so it must not merge two uid spaces.
    await restoreDevice(deviceA);
    expect(stored.get('sync.mergeLineage')).not.toBe(newLineage);
    await SyncService.reconcile(PASSPHRASE);

    // One gold asset, not two.
    expect((await db.assets.toArray()).map(row => row.name)).toEqual(['Shared gold']);
    expect(await expenseDescriptions()).toEqual(['B only']);
    expect(stored.get('sync.mergeLineage')).toBe(newLineage);
  });
});

describe('cost', () => {
  it('settles an idle sync against the version endpoint alone', async () => {
    await twoLinkedDevices();
    requests = 0;
    await SyncService.reconcile(PASSPHRASE);
    // One request: the cheap version probe. Nothing changed on either side, so
    // the snapshot is never downloaded.
    expect(requests).toBe(1);
  });
});
