import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// jsdom here gives us a window but no bare `localStorage`, which the sync state
// reads. Stubbed before any database work, because opening the store fires the
// hydration and change-listener hooks that read it.
const stored = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => void stored.set(key, value),
  removeItem: (key: string) => void stored.delete(key),
  clear: () => stored.clear(),
});

import { ALL_TABLES, db } from '@/data/database';
import { AssetRepository } from '@/data/repositories/assets/AssetRepository';
import { InvestmentRepository } from '@/data/repositories/assets/InvestmentRepository';
import { CurrencyRateRepository } from '@/data/repositories/settings/CurrencyRateRepository';
import { SettingsRepository } from '@/data/repositories/settings/SettingsRepository';
import { AutoSyncService } from '@/data/sync/AutoSyncService';
import { BackupService } from '@/domain/services/BackupService';
import { applyMerge } from './ApplyMerge';
import { deleteSynced } from './Tombstones';
import { InvestmentType, type IInvestment } from '@/domain/entities/assets/Investment';
import { ValueModel } from '@/domain/entities/assets/ValueModel';
import type { IAsset } from '@/domain/entities/assets/Asset';

/**
 * The merge against a real store: real Dexie, real transactions, real hooks.
 *
 * `MergeRows.test.ts` proves the rule; this proves the wiring around it — that a
 * row reaches the store stamped, that a delete leaves a tombstone behind, and
 * that another device's ids are translated rather than trusted. Those are the
 * parts that cannot be checked by reasoning about pure functions, and the parts
 * where a mistake silently loses or duplicates a user's records.
 */

const TABLES = [
  'assets',
  'investments',
  'sips',
  'expenses',
  'loans',
  'emis',
  'payments',
  'goals',
  'allocations',
  'settings',
  'currencyRates',
  'decisions',
  'memories',
  'deletions',
] as const;

/** A snapshot's `data`, with every table present — the shape `applyMerge` reads. */
function snapshotData(tables: Partial<Record<string, Record<string, unknown>[]>>) {
  const data: Record<string, Record<string, unknown>[]> = {};
  for (const name of TABLES) data[name] = tables[name] ?? [];
  return data;
}

function asset(overrides: Partial<IAsset> & Record<string, unknown> = {}) {
  return {
    name: 'Gold',
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
    ...overrides,
  } as unknown as IAsset;
}

function investment(overrides: Partial<IInvestment> & Record<string, unknown> = {}) {
  return {
    assetId: 1,
    type: InvestmentType.BUY,
    quantity: 1,
    totalAmount: 100,
    date: new Date('2026-01-01'),
    ...overrides,
  } as unknown as IInvestment;
}

beforeEach(async () => {
  stored.clear();
  if (!db.isOpen()) await db.open();
  await db.transaction('rw', ALL_TABLES, async () => {
    for (const table of ALL_TABLES) await table.clear();
  });
});

describe('the stamping hooks', () => {
  it('gives every created row a uid and a timestamp, without the repository asking', async () => {
    const created = await new AssetRepository().create(asset());
    const row = await db.assets.get(created.id!);
    expect(typeof row?.uid).toBe('string');
    expect(row?.updatedAt).toBeInstanceOf(Date);
  });

  it('keeps the uid when a whole row is replaced by put', async () => {
    // `IMemory`/`ISettings` are written with `put`, and the domain object handed
    // to it has no uid — it is not on the interface. Losing it here would make
    // the row look brand new to the next merge and duplicate it everywhere.
    const settings = new SettingsRepository();
    const first = await settings.save(await settings.get());
    const before = (await db.settings.get(first.id))?.uid;
    await settings.save({ ...first, baseCurrency: 'USD' });
    const after = await db.settings.get(first.id);
    expect(after?.uid).toBe(before);
    expect(after?.baseCurrency).toBe('USD');
  });

  it('moves the timestamp forward on a real edit', async () => {
    const repo = new AssetRepository();
    const created = await repo.create(asset());
    const before = (await db.assets.get(created.id!))!.updatedAt!;
    await new Promise(resolve => setTimeout(resolve, 5));
    await repo.update({ ...created, name: 'Silver' });
    const after = (await db.assets.get(created.id!))!.updatedAt!;
    expect(after.getTime()).toBeGreaterThan(before.getTime());
  });

  it('leaves the timestamp alone for an automatic write', async () => {
    // `updateValues()` runs on every launch. If merely opening the app moved
    // every asset's timestamp, it would outrank a real edit made on another
    // device an hour earlier and silently overwrite it.
    const repo = new AssetRepository();
    const created = await repo.create(asset());
    const before = (await db.assets.get(created.id!))!.updatedAt!;
    await new Promise(resolve => setTimeout(resolve, 5));
    await AutoSyncService.withoutScheduling(() => repo.update({ ...created, scriptValue: 42 }));
    const after = (await db.assets.get(created.id!))!;
    expect(after.updatedAt!.getTime()).toBe(before.getTime());
    expect(after.scriptValue).toBe(42);
    expect(after.uid).toBeDefined();
  });
});

describe('restoring a backup', () => {
  it('keeps each row own timestamp rather than dating them all as now', async () => {
    // `bulkAdd` fires the creating hook, so an unsuppressed restore stamps every
    // row with the time of the restore — and a device that had just recovered a
    // backup would then outrank every other device on every row, overwriting
    // newer edits with older ones on the next merge. Found by the two-device
    // test; pinned here because nothing else would catch its return.
    const created = await new AssetRepository().create(asset());
    const original = (await db.assets.get(created.id!))!.updatedAt!;
    const file = await BackupService.exportData();

    await new Promise(resolve => setTimeout(resolve, 10));
    await BackupService.importData(file);

    const restored = (await db.assets.toArray())[0];
    expect(restored.updatedAt!.getTime()).toBe(original.getTime());
    expect(restored.uid).toBeDefined();
  });
});

describe('deleting a synced row', () => {
  it('records a tombstone naming the row that went', async () => {
    const repo = new AssetRepository();
    const created = await repo.create(asset());
    const uid = (await db.assets.get(created.id!))!.uid;

    await repo.delete(created.id!);

    expect(await db.assets.count()).toBe(0);
    expect(await db.deletions.toArray()).toEqual([
      expect.objectContaining({ table: 'assets', key: uid }),
    ]);
  });

  it('records one for every row a cascade removes', async () => {
    // `deleteByAssetId` used to be a collection delete, which cannot know what
    // it removed. Every row it takes needs naming or the next merge restores it.
    const investments = new InvestmentRepository();
    await investments.create(investment({ assetId: 7 }));
    await investments.create(investment({ assetId: 7 }));
    await investments.create(investment({ assetId: 9 }));

    await investments.deleteByAssetId(7);

    expect(await db.investments.count()).toBe(1);
    const tombstones = await db.deletions.toArray();
    expect(tombstones).toHaveLength(2);
    expect(tombstones.every(row => row.table === 'investments')).toBe(true);
  });

  it('records one per rate when the base currency invalidates them all', async () => {
    const rates = new CurrencyRateRepository();
    await rates.save({ code: 'USD' } as never);
    await rates.save({ code: 'EUR' } as never);

    await rates.clearAll();

    expect(await db.currencyRates.count()).toBe(0);
    // Keyed by code, not uid: that is how the same rate is recognised on another
    // device, so it is what the tombstone has to name.
    expect((await db.deletions.toArray()).map(row => row.key).sort()).toEqual(['EUR', 'USD']);
  });

  it('deletes nothing when handed no ids', async () => {
    await new AssetRepository().create(asset());
    await deleteSynced('assets', []);
    expect(await db.assets.count()).toBe(1);
    expect(await db.deletions.count()).toBe(0);
  });
});

describe('merging another device into this one', () => {
  it('keeps rows only one side has, from both sides', async () => {
    await new AssetRepository().create(asset({ name: 'Mine' }));

    const report = await applyMerge(
      snapshotData({
        assets: [{ uid: 'theirs', ...asset({ name: 'Theirs' }), updatedAt: new Date() }],
      })
    );

    const names = (await db.assets.toArray()).map(row => row.name).sort();
    expect(names).toEqual(['Mine', 'Theirs']);
    // Ours is not in the snapshot, so the cloud has to be told about it.
    expect(report.localAhead).toBe(true);
  });

  it('takes the later edit of a row both sides changed, over the local row', async () => {
    const repo = new AssetRepository();
    const mine = await repo.create(asset({ name: 'Old name' }));
    const uid = (await db.assets.get(mine.id!))!.uid!;

    const report = await applyMerge(
      snapshotData({
        assets: [
          { uid, ...asset({ name: 'Newer name' }), updatedAt: new Date(Date.now() + 60_000) },
        ],
      })
    );

    const rows = await db.assets.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Newer name');
    // Written over the local row, keeping its id, so local children still point
    // at the right thing.
    expect(rows[0].id).toBe(mine.id);
    expect(report.localAhead).toBe(false);
  });

  it('keeps the local edit when it is the later one', async () => {
    const repo = new AssetRepository();
    const mine = await repo.create(asset({ name: 'Mine, edited' }));
    const uid = (await db.assets.get(mine.id!))!.uid!;

    const report = await applyMerge(
      snapshotData({
        assets: [{ uid, ...asset({ name: 'Stale' }), updatedAt: new Date(Date.now() - 60_000) }],
      })
    );

    expect((await db.assets.toArray())[0].name).toBe('Mine, edited');
    expect(report.localAhead).toBe(true);
  });

  it('removes a local row the other device deleted', async () => {
    const repo = new AssetRepository();
    const mine = await repo.create(asset());
    const uid = (await db.assets.get(mine.id!))!.uid!;

    await applyMerge(
      snapshotData({
        deletions: [{ table: 'assets', key: uid, deletedAt: new Date(Date.now() + 60_000) }],
      })
    );

    expect(await db.assets.count()).toBe(0);
  });

  it('translates an incoming reference into this device own ids', async () => {
    // The whole reason foreign keys cannot travel as-is: both devices count from
    // 1, so an incoming `assetId: 1` means "the asset that is 1 over there".
    const repo = new AssetRepository();
    await repo.create(asset({ name: 'Local filler' }));
    const localGold = await repo.create(asset({ name: 'Gold' }));
    const goldUid = (await db.assets.get(localGold.id!))!.uid!;
    expect(localGold.id).not.toBe(1);

    await applyMerge(
      snapshotData({
        // Ids as the other device numbered them: gold is 1 over there.
        assets: [{ uid: goldUid, ...asset({ name: 'Gold' }), id: 1, updatedAt: new Date() }],
        investments: [
          { uid: 'inv-1', ...investment({ assetId: 1 }), id: 1, updatedAt: new Date() },
        ],
      })
    );

    const merged = await db.investments.toArray();
    expect(merged).toHaveLength(1);
    expect(merged[0].assetId).toBe(localGold.id);
  });

  it('translates an id for a parent that arrives in the same snapshot', async () => {
    await applyMerge(
      snapshotData({
        assets: [{ uid: 'new-asset', ...asset(), id: 42, updatedAt: new Date() }],
        investments: [
          { uid: 'inv-1', ...investment({ assetId: 42 }), id: 7, updatedAt: new Date() },
        ],
      })
    );

    const [insertedAsset] = await db.assets.toArray();
    const [insertedInvestment] = await db.investments.toArray();
    expect(insertedInvestment.assetId).toBe(insertedAsset.id);
  });

  it('drops an incoming row whose required parent is gone', async () => {
    const report = await applyMerge(
      snapshotData({
        investments: [
          { uid: 'orphan', ...investment({ assetId: 99 }), id: 3, updatedAt: new Date() },
        ],
      })
    );

    expect(await db.investments.count()).toBe(0);
    expect(report.orphaned).toBe(1);
  });

  it('clears an optional reference rather than dropping the row', async () => {
    await applyMerge(
      snapshotData({
        assets: [{ uid: 'a', ...asset(), id: 1, updatedAt: new Date() }],
        investments: [
          { uid: 'inv', ...investment({ assetId: 1, sipId: 5 }), id: 1, updatedAt: new Date() },
        ],
      })
    );

    const [merged] = await db.investments.toArray();
    expect(merged.sipId).toBeUndefined();
    expect(merged.assetId).toBeDefined();
  });

  it('merges a currency rate by code without breaking its unique index', async () => {
    // `currencyRates` has `&code`. Matching on uid would try to write a second
    // INR row and abort the whole transaction.
    const rates = new CurrencyRateRepository();
    const local = await rates.save({ code: 'USD', manualPerUnitInBase: 80 } as never);

    await applyMerge(
      snapshotData({
        currencyRates: [
          {
            uid: 'a-different-uid',
            code: 'USD',
            manualPerUnitInBase: 90,
            updatedAt: new Date(Date.now() + 60_000),
          },
        ],
      })
    );

    const rows = await db.currencyRates.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].manualPerUnitInBase).toBe(90);
    expect(rows[0].id).toBe(local.id);
  });

  it('merges settings as the singleton it is', async () => {
    const settings = new SettingsRepository();
    const mine = await settings.save({ ...(await settings.get()), baseCurrency: 'INR' });

    await applyMerge(
      snapshotData({
        settings: [
          { ...mine, uid: 'other', baseCurrency: 'USD', updatedAt: new Date(Date.now() + 60_000) },
        ],
      })
    );

    const rows = await db.settings.toArray();
    expect(rows).toHaveLength(1);
    expect(rows[0].baseCurrency).toBe('USD');
  });

  it('does not wake a push of what it just merged in', async () => {
    // Every merge write goes through `withoutScheduling`. Without it a pull
    // armed a push of its own import, and left the device looking as though it
    // held unsynced work.
    const scheduled = vi.spyOn(AutoSyncService, 'isSuppressed');
    await applyMerge(snapshotData({ assets: [{ uid: 'a', ...asset(), updatedAt: new Date() }] }));
    expect(scheduled).toHaveReturnedWith(true);
    scheduled.mockRestore();
  });

  it('keeps the incoming timestamp rather than re-dating the row as now', async () => {
    // Re-dating an incoming row would have it win every future comparison.
    const theirTime = new Date('2026-03-01T00:00:00Z');
    await applyMerge(snapshotData({ assets: [{ uid: 'a', ...asset(), updatedAt: theirTime }] }));
    expect((await db.assets.toArray())[0].updatedAt!.getTime()).toBe(theirTime.getTime());
  });

  it('keeps the union of both devices tombstones so a third one hears about it', async () => {
    const repo = new AssetRepository();
    const mine = await repo.create(asset());
    await repo.delete(mine.id!);

    await applyMerge(
      snapshotData({
        deletions: [{ table: 'expenses', key: 'theirs', deletedAt: new Date() }],
      })
    );

    const keys = (await db.deletions.toArray()).map(row => row.key);
    expect(keys).toHaveLength(2);
    expect(keys).toContain('theirs');
  });
});
