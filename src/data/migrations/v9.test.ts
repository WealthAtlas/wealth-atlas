import { SETTINGS_ID } from '@/domain/entities/shared/Settings';
import { describe, expect, it } from 'vitest';
import { upgradeSettingsRowToV9, upgradeSnapshotDataToV9 } from './v9';

describe('upgradeSettingsRowToV9', () => {
  it('gives a v8 row an empty news block, meaning no provider configured', () => {
    const row: Record<string, unknown> = { id: SETTINGS_ID, ai: {}, targetAllocation: [] };
    upgradeSettingsRowToV9(row);

    expect(row.news).toEqual({});
  });

  it('keeps a key that is already there', () => {
    const row: Record<string, unknown> = { id: SETTINGS_ID, news: { apiKey: 'AV-KEY-1' } };
    upgradeSettingsRowToV9(row);

    expect(row.news).toEqual({ apiKey: 'AV-KEY-1' });
  });

  it('trims the whitespace a paste tends to bring', () => {
    const row: Record<string, unknown> = { id: SETTINGS_ID, news: { apiKey: '  AV-KEY-2\n' } };
    upgradeSettingsRowToV9(row);

    expect(row.news).toEqual({ apiKey: 'AV-KEY-2' });
  });

  it('drops a blank or non-string key so unset always reads as undefined', () => {
    for (const apiKey of ['', '   ', 42, null, undefined]) {
      const row: Record<string, unknown> = { id: SETTINGS_ID, news: { apiKey } };
      upgradeSettingsRowToV9(row);
      expect(row.news, String(apiKey)).toEqual({});
    }
  });

  it('drops fields that are not part of the block', () => {
    const row: Record<string, unknown> = {
      id: SETTINGS_ID,
      news: { apiKey: 'AV-KEY-3', baseUrl: 'https://elsewhere.test', junk: 1 },
    };
    upgradeSettingsRowToV9(row);

    // The endpoint is fixed in code, because the topic vocabulary has to match
    // what the aggregation can partition. A stored one would be a lie.
    expect(row.news).toEqual({ apiKey: 'AV-KEY-3' });
  });

  it('is idempotent', () => {
    const row: Record<string, unknown> = { id: SETTINGS_ID, news: { apiKey: 'AV-KEY-4' } };
    upgradeSettingsRowToV9(row);
    const once = { ...(row.news as object) };
    upgradeSettingsRowToV9(row);

    expect(row.news).toEqual(once);
  });
});

describe('upgradeSnapshotDataToV9', () => {
  it('upgrades every settings row in a snapshot', () => {
    const data: Record<string, unknown[] | undefined> = {
      settings: [{ id: SETTINGS_ID, ai: {}, targetAllocation: [] }],
    };
    upgradeSnapshotDataToV9(data);

    expect((data.settings as Record<string, unknown>[])[0].news).toEqual({});
  });

  it('seeds a settings row that still satisfies ISettings when the snapshot has none', () => {
    const data: Record<string, unknown[] | undefined> = {};
    upgradeSnapshotDataToV9(data);

    const row = (data.settings as Record<string, unknown>[])[0];
    expect(row.id).toBe(SETTINGS_ID);
    expect(row.news).toEqual({});
    expect(row.ai).toEqual({});
    expect(row.targetAllocation).toEqual([]);
    expect(Array.isArray(row.currencies)).toBe(true);
  });
});
