import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const stored = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => void stored.set(key, value),
  removeItem: (key: string) => void stored.delete(key),
  clear: () => stored.clear(),
});

import { db } from '@/data/database';
import {
  clearPendingChange,
  getPendingChangeSince,
  setAutoSyncEnabled,
  setKeyId,
} from '@/data/sync/state';
import { Currency } from '@/domain/entities/shared/Currency';
import { IAsset } from '@/domain/entities/assets/Asset';
import { ValueModel } from '@/domain/entities/assets/ValueModel';
import { AssetService } from './AssetService';

/**
 * The sweep that removes the transaction copies a past whole-row value write
 * embedded in each asset row.
 *
 * Driven against the real Dexie store for `SyncE2E`'s reason: the whole thing
 * turns on Dexie deleting a property whose value in the changes object is
 * `undefined`, and if that ever stopped being true the sweep would go on running
 * on every launch, reporting nothing, cleaning nothing. Neither `tsc` nor a test
 * of a pure function can see it.
 */
const SCRIPTED: IAsset = {
  id: undefined,
  name: 'Index Fund',
  description: '',
  category: 'Mutual Fund',
  currency: Currency.INR,
  valueModel: ValueModel.MARKET_BASED,
  interestRate: undefined,
  maturityDate: undefined,
  maturityAmount: undefined,
  manualValue: undefined,
  manualValueUpdatedAt: undefined,
  // Fresh, so the sweep is the only thing this exercises: no script runs.
  script: 'exports.getValue = async () => 1;',
  scriptValue: 250,
  scriptValueUpdatedAt: new Date(),
};

async function keysOf(id: number): Promise<string[]> {
  return Object.keys((await db.assets.get(id)) as unknown as Record<string, unknown>);
}

describe('embedded transaction copies', () => {
  beforeEach(async () => {
    stored.clear();
    await db.assets.clear();
  });

  it('are cleared from a row that a past whole-row write left them in', async () => {
    const id = await db.assets.add({
      ...SCRIPTED,
      investments: [{ id: 1, assetId: 1, totalAmount: 5000, date: new Date() }],
      sips: [],
    } as IAsset);

    await new AssetService().updateValues();

    expect(await keysOf(id)).not.toContain('investments');
    expect(await keysOf(id)).not.toContain('sips');
  });

  it('leave the rest of the row exactly as it stands', async () => {
    const id = await db.assets.add({ ...SCRIPTED, investments: [], sips: [] } as IAsset);

    await new AssetService().updateValues();

    const row = (await db.assets.get(id))!;
    expect(row.name).toBe('Index Fund');
    expect(row.script).toBe(SCRIPTED.script);
    expect(row.scriptValue).toBe(250);
  });

  it('leave a clean row untouched, so the sweep costs nothing once it has run', async () => {
    const id = await db.assets.add({ ...SCRIPTED });
    const before = await keysOf(id);

    await new AssetService().updateValues();

    expect(await keysOf(id)).toEqual(before);
  });

  it('are not published, so no device pushes its whole database over this', async () => {
    // The rows are not the user changing their mind. Unsuppressed, every device
    // would arm a push on the first launch after this build and race its own
    // first pull, with whichever won deciding silently which copy survived.
    setKeyId('key-1');
    setAutoSyncEnabled(true);
    await db.assets.add({ ...SCRIPTED, investments: [], sips: [] } as IAsset);
    // The seeding write is a create like any other and marks the device pending;
    // what is under test is whether the sweep adds one of its own.
    clearPendingChange();

    await new AssetService().updateValues();

    expect(getPendingChangeSince()).toBeUndefined();
  });
});
