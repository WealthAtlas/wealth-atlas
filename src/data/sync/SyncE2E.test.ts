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
const cloud = new Map<string, { version: number; payload: string; meta: CryptoMeta }>();
let requests = 0;
let puts = 0;

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
    puts++;
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
import { LoanRepository } from '@/data/repositories/loan/LoanRepository';
import { AutoSyncService } from '@/data/sync/AutoSyncService';
import { SyncService } from '@/data/sync/Syncer';
import { decryptJson, encryptJson, type CryptoMeta } from '@/data/sync/crypto';
import type { Snapshot } from '@/data/sync/types';
import { SyncConflictError, SyncDowngradeError } from '@/data/sync/conflict';
import { ValueModel } from '@/domain/entities/assets/ValueModel';
import type { IAsset } from '@/domain/entities/assets/Asset';
import type { IExpense } from '@/domain/entities/expenses/Expense';
import type { ILoan } from '@/domain/entities/loans/Loan';

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

function loan(name: string) {
  return {
    name,
    principalAmount: 1000,
    currency: 'INR',
    startDate: new Date('2026-01-01'),
    description: '',
  } as unknown as ILoan;
}

const assets = new AssetRepository();
const expenses = new ExpenseRepository();
const loans = new LoanRepository();

async function assetNames(): Promise<string[]> {
  return (await db.assets.toArray()).map(row => row.name).sort();
}

async function loanNames(): Promise<string[]> {
  return (await db.loans.toArray()).map(row => row.name).sort();
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

    // A is still on the old lineage, so it must not merge two uid spaces. It also
    // holds records, so it asks before replacing them rather than inferring that
    // the cloud copy is the one to keep.
    await restoreDevice(deviceA);
    expect(stored.get('sync.mergeLineage')).not.toBe(newLineage);
    await expect(SyncService.reconcile(PASSPHRASE)).rejects.toThrow(SyncConflictError);
    await SyncService.resolveConflict('take-remote', PASSPHRASE);

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

describe('a device that was already linked before merging existed', () => {
  /**
   * The state every existing multi-device user upgrades into: a key and a
   * version in local storage, and no lineage — that key is new, and nothing
   * backfills it.
   */
  function forgetLineage(...devices: Device[]): void {
    for (const device of devices) device.state.delete('sync.mergeLineage');
  }

  it('publishes a lineage rather than none, so the pair converges after one replace', async () => {
    // Publishing `undefined` unset the lineage in the cloud, and `mergeAllowed`
    // then refused to merge anything at all: every sync became a whole-database
    // replace, which keeps only what the cloud already holds. Two such devices
    // never escaped it either — each import minted a lineage locally that the
    // cloud was never told about, so the next snapshot mismatched again.
    const { deviceA, deviceB } = await twoLinkedDevices();
    forgetLineage(deviceA, deviceB);

    await restoreDevice(deviceA);
    await assets.create(asset('A only'));
    await loans.create(loan('A loan'));
    await SyncService.reconcile(PASSPHRASE);
    let withA = await captureDevice();
    const lineage = withA.state.get('sync.mergeLineage');
    expect(lineage).toBeDefined();

    // B holds records, so replacing them is a question rather than an inference —
    // asked once, and never again after the lineage is shared.
    await restoreDevice(deviceB);
    await expect(SyncService.reconcile(PASSPHRASE)).rejects.toThrow(SyncConflictError);
    await SyncService.resolveConflict('take-remote', PASSPHRASE);
    expect(stored.get('sync.mergeLineage')).toBe(lineage);

    // From here it is a merge: B keeps what A sent and its own work too.
    await assets.create(asset('B only'));
    await loans.create(loan('B loan'));
    await SyncService.reconcile(PASSPHRASE);
    expect(await assetNames()).toEqual(['A only', 'B only', 'Shared gold']);
    const withB = await captureDevice();

    await restoreDevice(withA);
    // A merges rather than asking: the lineage is shared now, so nothing is
    // being replaced and every row on both sides survives.
    await SyncService.reconcile(PASSPHRASE);
    expect(await assetNames()).toEqual(['A only', 'B only', 'Shared gold']);
    expect(await loanNames()).toEqual(['A loan', 'B loan']);
    withA = await captureDevice();

    // And it stays settled rather than replacing on every poll.
    await restoreDevice(withB);
    await SyncService.reconcile(PASSPHRASE);
    expect(await assetNames()).toEqual(['A only', 'B only', 'Shared gold']);
    await restoreDevice(withA);
    await SyncService.reconcile(PASSPHRASE);
    expect(await assetNames()).toEqual(['A only', 'B only', 'Shared gold']);
  });

  it('still asks rather than replacing when the second device holds unpushed work', async () => {
    const { deviceA, deviceB } = await twoLinkedDevices();
    forgetLineage(deviceA, deviceB);

    await restoreDevice(deviceA);
    await assets.create(asset('A only'));
    await SyncService.reconcile(PASSPHRASE);
    const withA = await captureDevice();

    await restoreDevice(deviceB);
    await assets.create(asset('B only'));
    await expect(SyncService.reconcile(PASSPHRASE)).rejects.toThrow(SyncConflictError);
    // Nothing taken away behind the user back while the question stands.
    expect(await assetNames()).toEqual(['B only', 'Shared gold']);

    await SyncService.resolveConflict('keep-local', PASSPHRASE);
    const withB = await captureDevice();

    await restoreDevice(withA);
    await expect(SyncService.reconcile(PASSPHRASE)).rejects.toThrow(SyncConflictError);
    await SyncService.resolveConflict('take-remote', PASSPHRASE);
    expect(await assetNames()).toEqual(['B only', 'Shared gold']);
    const replacedA = await captureDevice();

    // ...and the two of them merge from then on rather than replacing again.
    await restoreDevice(replacedA);
    await assets.create(asset('A again'));
    await SyncService.reconcile(PASSPHRASE);
    await restoreDevice(withB);
    await SyncService.reconcile(PASSPHRASE);
    expect(await assetNames()).toEqual(['A again', 'B only', 'Shared gold']);
  });
});

describe('a pair that has converged', () => {
  it('stops pushing, rather than trading the same snapshot back and forth', async () => {
    // Every row a merge leaves behind carries the same `updatedAt` on both
    // devices. Reading that tie as "this device is ahead" had each side publish
    // the snapshot it had just merged, and the other merge and publish that, on
    // every poll for ever — and while the lineage was unset, every one of those
    // pushes was another whole-database replace on the other device.
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    await expenses.create(expense('A work'));
    await SyncService.reconcile(PASSPHRASE);
    let withA = await captureDevice();

    await restoreDevice(deviceB);
    await SyncService.reconcile(PASSPHRASE);
    let withB = await captureDevice();

    await restoreDevice(withA);
    await SyncService.reconcile(PASSPHRASE);
    withA = await captureDevice();

    puts = 0;
    await restoreDevice(withB);
    await SyncService.reconcile(PASSPHRASE);
    withB = await captureDevice();
    await restoreDevice(withA);
    await SyncService.reconcile(PASSPHRASE);
    await restoreDevice(withB);
    await SyncService.reconcile(PASSPHRASE);
    expect(puts).toBe(0);
  });
});

describe('a cloud copy overwritten by an older build of the app', () => {
  /**
   * What an older build's push actually leaves behind.
   *
   * It cannot be simulated by editing rows: the damage is in the *shape*. An
   * older build has no `deletions` table and no `lineage` field, so it exports
   * neither — every tombstone is gone, and every device that reads it drops from
   * merging to replacing itself.
   */
  async function pushFromAnOlderBuild(keyId: string): Promise<void> {
    const entry = cloud.get(keyId)!;
    const current = await decryptJson<Snapshot>(entry.payload, entry.meta, PASSPHRASE);
    const older = {
      schemaVersion: 16,
      data: { ...current.data, deletions: [] },
    } as unknown as Snapshot;
    const { payload, meta } = await encryptJson(older, PASSPHRASE, 16);
    cloud.set(keyId, { version: entry.version + 1, payload, meta });
  }

  it('is refused rather than read, and nothing on this device is touched', async () => {
    const { keyId, deviceA } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    await assets.create(asset('Only on A'));
    await expenses.create(expense('Only on A too'));
    await SyncService.reconcile(PASSPHRASE);
    const before = await assetNames();

    await pushFromAnOlderBuild(keyId);

    await expect(SyncService.reconcile(PASSPHRASE)).rejects.toThrow(SyncDowngradeError);
    expect(await assetNames()).toEqual(before);
    expect(await expenseDescriptions()).toEqual(['Only on A too']);

    // Said out loud rather than retried into silence, and not as a choice of
    // copies: taking the cloud copy is the one answer that would lose the rows.
    const conflict = SyncService.getStatus().conflict;
    expect(conflict?.kind).toBe('downgrade');
    expect(conflict?.snapshotVersion).toBe(16);
  });

  it('resumes by itself once that device is updated', async () => {
    const { keyId, deviceA } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    await assets.create(asset('Only on A'));
    await SyncService.reconcile(PASSPHRASE);

    await pushFromAnOlderBuild(keyId);
    await expect(SyncService.reconcile(PASSPHRASE)).rejects.toThrow(SyncDowngradeError);

    // The other device updates and pushes this build's shape again. Simulated
    // the same way: re-export what a current build would write.
    const entry = cloud.get(keyId)!;
    const stale = await decryptJson<Snapshot>(entry.payload, entry.meta, PASSPHRASE);
    const restored = {
      ...stale,
      schemaVersion: 17,
      lineage: stored.get('sync.mergeLineage'),
      data: { ...stale.data, deletions: [] },
    } as unknown as Snapshot;
    const { payload, meta } = await encryptJson(restored, PASSPHRASE, 17);
    cloud.set(keyId, { version: entry.version + 1, payload, meta });

    await SyncService.reconcile(PASSPHRASE);
    expect(SyncService.getStatus().conflict).toBeUndefined();
    expect(await assetNames()).toEqual(['Only on A', 'Shared gold']);
  });

  it('does not refuse the ordinary case of a cloud nobody has upgraded yet', async () => {
    // An older snapshot is normal right after an upgrade and is migrated
    // forward. Only one older than what this device has already read from this
    // key means some device overwrote it.
    stored.delete('sync.highestSnapshotVersion');
    const { keyId, deviceA } = await twoLinkedDevices();
    await pushFromAnOlderBuild(keyId);
    stored.delete('sync.highestSnapshotVersion');

    await restoreDevice(deviceA);
    stored.delete('sync.highestSnapshotVersion');
    // Not a downgrade, so not refused. It is still a replace of a device holding
    // records, so it asks — and answering it goes through, which is the thing
    // being pinned: the guard has not swallowed the ordinary case.
    await expect(SyncService.reconcile(PASSPHRASE)).rejects.toThrow(SyncConflictError);
    expect(SyncService.getStatus().conflict?.kind ?? 'diverged').toBe('diverged');
    await SyncService.resolveConflict('take-remote', PASSPHRASE);
    expect(await assetNames()).toEqual(['Shared gold']);
  });
});

describe('saving a record without editing it', () => {
  it('does not make the stale device the winner', async () => {
    // The mechanism behind "I opened the old device and it overwrote everything".
    // A dialog hands back the row it was given, so Save fires the update hooks
    // with no change in them — and the row used to come out re-dated. That made
    // the *older* copy the latest change, and last-write-wins then did exactly
    // as it was told: the real edit on the other device lost.
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    const [onA] = await db.assets.toArray();
    await assets.update({ ...onA, name: 'Edited on A' });
    await SyncService.reconcile(PASSPHRASE);

    // B is stale. Its user opens the asset and presses Save, changing nothing.
    await restoreDevice(deviceB);
    const [onB] = await db.assets.toArray();
    await new Promise(resolve => setTimeout(resolve, 5));
    await assets.update({ ...onB });
    // A's edit replaces the row here, so the merge is held for confirmation.
    await expect(SyncService.reconcile(PASSPHRASE)).rejects.toThrow(SyncConflictError);
    await SyncService.confirmMerge(PASSPHRASE);

    // A's edit stands, because B never actually changed anything.
    expect(await assetNames()).toEqual(['Edited on A']);
  });

  it('arms no push, so an idle device stays idle', async () => {
    const { deviceA } = await twoLinkedDevices();
    await restoreDevice(deviceA);
    const [row] = await db.assets.toArray();

    stored.delete('sync.pendingChangeSince');
    puts = 0;
    await assets.update({ ...row });
    await SyncService.reconcile(PASSPHRASE);

    expect(stored.get('sync.pendingChangeSince')).toBeUndefined();
    expect(puts).toBe(0);
  });
});

describe('a merge that would change records already on this device', () => {
  it('is held for confirmation, naming what it would replace', async () => {
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    const [onA] = await db.assets.toArray();
    await assets.update({ ...onA, name: 'Renamed on A' });
    await SyncService.reconcile(PASSPHRASE);

    await restoreDevice(deviceB);
    await expect(SyncService.reconcile(PASSPHRASE)).rejects.toThrow(SyncConflictError);

    const conflict = SyncService.getStatus().conflict;
    expect(conflict?.kind).toBe('overwrite');
    expect(conflict?.overwriteCount).toBe(1);
    // Named as the user knows it, so the dialog is about a record rather than a row id.
    expect(conflict?.impacts?.[0]?.label).toBe('Shared gold');
    // And nothing has happened yet, which is what makes it a question.
    expect(await assetNames()).toEqual(['Shared gold']);
  });

  it('goes through once confirmed', async () => {
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    const [onA] = await db.assets.toArray();
    await assets.update({ ...onA, name: 'Renamed on A' });
    await SyncService.reconcile(PASSPHRASE);

    await restoreDevice(deviceB);
    await expect(SyncService.reconcile(PASSPHRASE)).rejects.toThrow(SyncConflictError);
    await SyncService.confirmMerge(PASSPHRASE);

    expect(await assetNames()).toEqual(['Renamed on A']);
    expect(SyncService.getStatus().conflict).toBeUndefined();
  });

  it('does not ask when the merge only adds records', async () => {
    // The ordinary state of one person with two devices. Asking here would be a
    // prompt on almost every session, which is how a dialog stops being read.
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    await expenses.create(expense('A groceries'));
    await SyncService.reconcile(PASSPHRASE);

    await restoreDevice(deviceB);
    await expenses.create(expense('B fuel'));
    await SyncService.reconcile(PASSPHRASE);

    expect(await expenseDescriptions()).toEqual(['A groceries', 'B fuel']);
    expect(SyncService.getStatus().conflict).toBeUndefined();
  });

  it('does not ask about a deletion another device made on purpose', async () => {
    // A removal carries a tombstone naming the delete behind it. Someone chose
    // that; re-asking would nag every device about every deletion.
    const { deviceA, deviceB } = await twoLinkedDevices();

    await restoreDevice(deviceA);
    const created = await expenses.create(expense('Doomed'));
    await SyncService.reconcile(PASSPHRASE);
    await expenses.delete(created.id!);
    await SyncService.reconcile(PASSPHRASE);

    await restoreDevice(deviceB);
    await SyncService.reconcile(PASSPHRASE);
    expect(await expenseDescriptions()).toEqual([]);
    expect(SyncService.getStatus().conflict).toBeUndefined();
  });
});
