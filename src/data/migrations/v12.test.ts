import { describe, expect, it } from 'vitest';
import { stampRowToV12, upgradeSnapshotDataToV12 } from './v12';

/**
 * The migration that makes merging possible at all. It runs once per device,
 * silently, and a row it misses is a row that can never be matched against its
 * counterpart on another device.
 */
describe('stamping rows for v12', () => {
  it('gives a row a uid and a timestamp', () => {
    const row: Record<string, unknown> = { name: 'Gold' };
    stampRowToV12(row);
    expect(typeof row.uid).toBe('string');
    expect((row.uid as string).length).toBeGreaterThan(8);
    expect(row.updatedAt).toBeInstanceOf(Date);
  });

  it('dates existing rows to the epoch, not to now', () => {
    // These rows predate merging and nothing is known about when they were last
    // touched. Dating them "now" would have a device that merely upgraded
    // outrank every real edit waiting on another one.
    const row: Record<string, unknown> = { name: 'Gold' };
    stampRowToV12(row);
    expect((row.updatedAt as Date).getTime()).toBe(0);
  });

  it('gives two rows different uids', () => {
    const a: Record<string, unknown> = {};
    const b: Record<string, unknown> = {};
    stampRowToV12(a);
    stampRowToV12(b);
    expect(a.uid).not.toBe(b.uid);
  });

  it('leaves a row that already has the columns alone', () => {
    const stamped = { uid: 'kept', updatedAt: new Date('2026-01-01') };
    const row: Record<string, unknown> = { ...stamped };
    stampRowToV12(row);
    expect(row).toEqual(stamped);
  });
});

describe('upgrading a pre-v12 snapshot', () => {
  it('stamps every synced table', () => {
    const data: Record<string, unknown[] | undefined> = {
      assets: [{ name: 'Gold' }],
      investments: [{ assetId: 1 }],
      memories: [{ text: 'x' }],
    };
    upgradeSnapshotDataToV12(data);
    for (const rows of [data.assets, data.investments, data.memories]) {
      expect((rows as Record<string, unknown>[])[0].uid).toBeDefined();
    }
  });

  it('adds an empty deletions list, because bulkPut(undefined) is not bulkPut([])', () => {
    const data: Record<string, unknown[] | undefined> = {};
    upgradeSnapshotDataToV12(data);
    expect(data.deletions).toEqual([]);
  });

  it('leaves recorded deletions alone', () => {
    const deletions = [{ table: 'assets', key: 'a', deletedAt: new Date() }];
    const data: Record<string, unknown[] | undefined> = { deletions };
    upgradeSnapshotDataToV12(data);
    expect(data.deletions).toBe(deletions);
  });
});
