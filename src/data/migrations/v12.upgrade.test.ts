import 'fake-indexeddb/auto';
import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const stored = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => void stored.set(key, value),
  removeItem: (key: string) => void stored.delete(key),
  clear: () => stored.clear(),
});

/**
 * The v12 upgrade against a store that really is on v11.
 *
 * `v12.test.ts` covers the row transform; this covers the thing the transform
 * cannot see — that its result survives being written through Dexie, whose
 * `updating` hook now also stamps `updatedAt`. If that hook fires during an
 * upgrade, every migrated row is dated with the moment of the upgrade instead of
 * the epoch, and merely installing a new build would make a device outrank every
 * real edit sitting on every other one.
 *
 * Each case needs a store that is genuinely on the old version, so the database
 * is deleted and the module registry reset between them — the app's `db` is a
 * singleton created at import time, and an upgrade only ever runs once.
 */
let opened: { close: () => void } | undefined;

/** Imports a freshly constructed app database and opens it, running upgrades. */
async function openApp() {
  const { db } = await import('@/data/database');
  opened = db;
  await db.open();
  return db;
}

beforeEach(async () => {
  vi.resetModules();
  await Dexie.delete('WealthAtlasDB');
});

afterEach(() => {
  opened?.close();
  opened = undefined;
});
describe('upgrading a v3 store all the way to v12', () => {
  it('runs the whole chain and still leaves the rows dated to the epoch', async () => {
    // The longer path matters on its own: `v4`'s transforms write rows too, so
    // an unsuppressed hook there would mint a timestamp that `v12` then finds
    // already set and preserves — the same bug arriving one migration earlier.
    const legacy = new Dexie('WealthAtlasDB');
    legacy.version(3).stores({
      assets: '++id, name, category, currency',
      investments: '++id, assetId, type, quantity, price, date',
    });
    await legacy.open();
    await legacy.table('assets').add({ name: 'Gold', category: 'Gold', currency: '₹' });
    await legacy
      .table('investments')
      .add({ assetId: 1, type: 'buy', quantity: 2, price: 500, date: new Date('2026-01-01') });
    legacy.close();

    const db = await openApp();

    const [asset] = await db.assets.toArray();
    const [investment] = await db.investments.toArray();

    // The old migrations still did their work...
    expect(asset.currency).toBe('INR');
    expect(investment.totalAmount).toBe(500);
    expect((investment as unknown as Record<string, unknown>).price).toBeUndefined();

    // ...and none of them claimed the rows had just been edited.
    expect(asset.uid).toBeDefined();
    expect(asset.updatedAt?.getTime()).toBe(0);
    expect(investment.updatedAt?.getTime()).toBe(0);
  });
});

describe('upgrading a v11 store to v12', () => {
  it('stamps every row without dating it as now', async () => {
    const legacy = new Dexie('WealthAtlasDB');
    legacy.version(11).stores({
      assets: '++id, name, category',
      expenses: '++id, date, category',
    });
    await legacy.open();
    await legacy.table('assets').add({ name: 'Gold', category: 'Gold' });
    await legacy.table('expenses').add({ description: 'Rent', category: 'Home' });
    legacy.close();

    // Imported only now, so the singleton is constructed against a store that is
    // genuinely a version behind.
    const db = await openApp();

    const [asset] = await db.assets.toArray();
    const [expense] = await db.expenses.toArray();

    expect(asset.uid).toBeDefined();
    expect(expense.uid).toBeDefined();
    expect(asset.uid).not.toBe(expense.uid);

    // The epoch, deliberately: nothing is known about when these rows were last
    // touched, and guessing "now" is the guess that loses other devices' work.
    expect(asset.updatedAt?.getTime()).toBe(0);
    expect(expense.updatedAt?.getTime()).toBe(0);
  });
});
