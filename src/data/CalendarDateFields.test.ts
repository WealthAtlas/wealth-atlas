import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Same stub as the other store-backed suites: opening the database fires the
// hydration and change-listener hooks, and those read a bare `localStorage`.
const stored = new Map<string, string>();
vi.stubGlobal('localStorage', {
  getItem: (key: string) => stored.get(key) ?? null,
  setItem: (key: string, value: string) => void stored.set(key, value),
  removeItem: (key: string) => void stored.delete(key),
  clear: () => stored.clear(),
});

import { ALL_TABLES, db } from '@/data/database';
import { InvestmentType } from '@/domain/entities/assets/Investment';
import { ValueModel } from '@/domain/entities/assets/ValueModel';
import { isNoOpUpdate } from '@/data/sync/RowChanges';
import { calendarDateModifications, normaliseCalendarDates } from './CalendarDateFields';

/**
 * The write half of the UTC-day rule, against the real store.
 *
 * The pure part below is worth little on its own — what matters is that the
 * Dexie hooks actually apply it, that they leave the machine timestamps alone,
 * and that they do not disturb `isNoOpUpdate`. That last one is the reason this
 * is an integration test rather than a unit test: a truncation folded in at the
 * wrong point would make every re-save of an untouched row look like an edit,
 * and an edit publishes the whole database — which bumps the cloud version, makes
 * every other device stale, and turns each of their next edits into a conflict.
 * No pure test of either piece would catch it.
 */
describe('CALENDAR_DATE_FIELDS as a table', () => {
  it('truncates the listed fields of a row and leaves the machine stamps alone', () => {
    const row: Record<string, unknown> = {
      maturityDate: new Date('2026-06-15T18:45:00.000Z'),
      manualValueUpdatedAt: new Date('2026-06-15T18:45:00.000Z'),
    };
    normaliseCalendarDates('assets', row);

    expect((row.maturityDate as Date).toISOString()).toBe('2026-06-15T00:00:00.000Z');
    expect((row.manualValueUpdatedAt as Date).toISOString()).toBe('2026-06-15T18:45:00.000Z');
  });

  it('ignores a table with no date-only columns', () => {
    const row: Record<string, unknown> = { createdAt: new Date('2026-06-15T18:45:00.000Z') };
    normaliseCalendarDates('memories', row);
    expect((row.createdAt as Date).toISOString()).toBe('2026-06-15T18:45:00.000Z');
  });

  // A partial update must not drag a field it never mentioned into the write:
  // that would turn an unrelated edit into a date change, and through
  // `isNoOpUpdate` into a push nobody asked for.
  it('reports nothing for a field the write does not touch', () => {
    expect(calendarDateModifications('investments', { totalAmount: 5 })).toEqual({});
  });

  it('reports nothing for a value that is already a clean day', () => {
    expect(
      calendarDateModifications('investments', { date: new Date('2026-06-15T00:00:00.000Z') })
    ).toEqual({});
  });

  it('leaves an unparseable date for validation rather than truncating it', () => {
    const modifications = { date: new Date('nonsense') };
    expect(calendarDateModifications('investments', modifications)).toEqual({});
  });
});

describe('the Dexie hooks', () => {
  beforeEach(async () => {
    if (!db.isOpen()) await db.open();
    await db.transaction('rw', ALL_TABLES, async () => {
      for (const table of ALL_TABLES) await table.clear();
    });
  });

  const investment = (date: Date) => ({
    assetId: 1,
    type: InvestmentType.BUY,
    quantity: 1,
    totalAmount: 100,
    date,
  });

  it('truncates a calendar date on create, whatever the caller passed', async () => {
    const id = await db.investments.add(investment(new Date('2026-06-15T18:45:00.000Z')) as never);
    const stored = await db.investments.get(id);

    expect(stored!.date.toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });

  it('truncates on update too', async () => {
    const id = await db.investments.add(investment(new Date('2026-06-15')) as never);
    await db.investments.update(id, { date: new Date('2026-07-20T23:59:00.000Z') } as never);

    expect((await db.investments.get(id))!.date.toISOString()).toBe('2026-07-20T00:00:00.000Z');
  });

  // The invariant this file exists for. Two writes of the same clean day are one
  // write as far as sync is concerned, and the second must claim nothing —
  // judged the way the hooks judge it: fold the truncations into the
  // modifications first, then ask whether anything is left.
  it('leaves a re-save of an unchanged row a no-op, so no push is armed', async () => {
    const id = await db.investments.add(investment(new Date('2026-06-15')) as never);
    const stored = (await db.investments.get(id)) as unknown as Record<string, unknown>;

    const write = { ...stored, date: new Date('2026-06-15T00:00:00.000Z') };
    Object.assign(write, calendarDateModifications('investments', write));

    expect(isNoOpUpdate(write, stored)).toBe(true);
  });

  // `Collection.modify` is what a schema upgrade is made of, and it fires the
  // same hook — so there is no write path left that can put a time back into a
  // date-only column.
  it('truncates through a collection modify as well', async () => {
    const id = await db.investments.add(investment(new Date('2026-06-15')) as never);
    await db.investments
      .where(':id')
      .equals(id)
      .modify(row => {
        (row as { date: Date }).date = new Date('2026-08-02T11:00:00.000Z');
      });

    expect((await db.investments.get(id))!.date.toISOString()).toBe('2026-08-02T00:00:00.000Z');
  });

  // The other side of it: normalising a legacy value *is* a change to the row,
  // and must be recorded as one rather than written behind sync's back. The row
  // is planted through the raw IndexedDB handle, because that is the only way to
  // produce what an older build left behind — every Dexie path now truncates.
  it('counts normalising a legacy timestamped value as a real change', async () => {
    const id = await db.investments.add(investment(new Date('2026-06-15')) as never);
    const legacy = await db.investments.get(id);

    await new Promise<void>((resolve, reject) => {
      const tx = db.backendDB().transaction(['investments'], 'readwrite');
      const request = tx.objectStore('investments').put({
        ...legacy,
        date: new Date('2026-06-15T18:30:00.000Z'),
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    const planted = await db.investments.get(id);
    expect(planted!.date.toISOString()).toBe('2026-06-15T18:30:00.000Z');

    const write = { ...planted, date: new Date('2026-06-15T18:30:00.000Z') } as Record<
      string,
      unknown
    >;
    Object.assign(write, calendarDateModifications('investments', write));
    expect(isNoOpUpdate(write, planted as unknown as Record<string, unknown>)).toBe(false);

    await db.investments.put({ ...planted, date: new Date('2026-06-15T18:30:00.000Z') } as never);
    expect((await db.investments.get(id))!.date.toISOString()).toBe('2026-06-15T00:00:00.000Z');
  });

  it('does not truncate the value-refresh stamps on an asset', async () => {
    const stamp = new Date('2026-06-15T18:45:00.000Z');
    const id = await db.assets.add({
      name: 'Gold',
      description: '',
      category: 'Gold',
      currency: 'INR',
      valueModel: ValueModel.MARKET_BASED,
      manualValue: 100,
      manualValueUpdatedAt: stamp,
      maturityDate: new Date('2030-04-01T09:00:00.000Z'),
    } as never);
    const asset = await db.assets.get(id);

    expect(asset!.manualValueUpdatedAt!.toISOString()).toBe('2026-06-15T18:45:00.000Z');
    expect(asset!.maturityDate!.toISOString()).toBe('2030-04-01T00:00:00.000Z');
  });
});
