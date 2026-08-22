import { AssetCategory } from '@/domain/entities/assets/AssetCategory';
import { SETTINGS_ID } from '@/domain/entities/shared/Settings';
import { describe, expect, it } from 'vitest';
import { upgradeSettingsRowToV8, upgradeSnapshotDataToV8 } from './v8';

describe('upgradeSettingsRowToV8', () => {
  it('gives a v7 row an empty allocation, meaning no policy has been set', () => {
    const row: Record<string, unknown> = { id: SETTINGS_ID, baseCurrency: 'INR', ai: {} };
    upgradeSettingsRowToV8(row);

    expect(row.targetAllocation).toEqual([]);
  });

  it('keeps an allocation that is already there', () => {
    const targets = [
      { category: AssetCategory.STOCK, targetPercent: 60, bandPercent: 5 },
      { category: AssetCategory.DEBT, targetPercent: 40 },
    ];
    const row: Record<string, unknown> = { id: SETTINGS_ID, targetAllocation: targets };
    upgradeSettingsRowToV8(row);

    expect(row.targetAllocation).toEqual(targets);
  });

  it('keeps a deliberate zero target rather than treating it as unset', () => {
    const row: Record<string, unknown> = {
      id: SETTINGS_ID,
      targetAllocation: [{ category: AssetCategory.CRYPTOCURRENCY, targetPercent: 0 }],
    };
    upgradeSettingsRowToV8(row);

    expect(row.targetAllocation).toEqual([
      { category: AssetCategory.CRYPTOCURRENCY, targetPercent: 0 },
    ]);
  });

  it('drops entries that cannot be stored', () => {
    const row: Record<string, unknown> = {
      id: SETTINGS_ID,
      targetAllocation: [
        { category: AssetCategory.GOLD, targetPercent: 10 },
        { category: '   ', targetPercent: 20 },
        { category: AssetCategory.CASH, targetPercent: 'nonsense' },
        { category: AssetCategory.DEBT, targetPercent: -5 },
        null,
        'junk',
      ],
    };
    upgradeSettingsRowToV8(row);

    expect(row.targetAllocation).toEqual([{ category: AssetCategory.GOLD, targetPercent: 10 }]);
  });

  it('keeps only the first target for a repeated category', () => {
    const row: Record<string, unknown> = {
      id: SETTINGS_ID,
      targetAllocation: [
        { category: AssetCategory.STOCK, targetPercent: 60 },
        { category: AssetCategory.STOCK, targetPercent: 30 },
      ],
    };
    upgradeSettingsRowToV8(row);

    expect(row.targetAllocation).toEqual([{ category: AssetCategory.STOCK, targetPercent: 60 }]);
  });

  it('clamps a percentage above 100 rather than storing an impossible target', () => {
    const row: Record<string, unknown> = {
      id: SETTINGS_ID,
      targetAllocation: [{ category: AssetCategory.STOCK, targetPercent: 140, bandPercent: 999 }],
    };
    upgradeSettingsRowToV8(row);

    expect(row.targetAllocation).toEqual([
      { category: AssetCategory.STOCK, targetPercent: 100, bandPercent: 100 },
    ]);
  });

  it('replaces a non-array with an empty allocation', () => {
    const row: Record<string, unknown> = { id: SETTINGS_ID, targetAllocation: 'broken' };
    upgradeSettingsRowToV8(row);

    expect(row.targetAllocation).toEqual([]);
  });

  it('is idempotent', () => {
    const row: Record<string, unknown> = {
      id: SETTINGS_ID,
      targetAllocation: [{ category: AssetCategory.GOLD, targetPercent: 12.345 }],
    };
    upgradeSettingsRowToV8(row);
    const once = JSON.parse(JSON.stringify(row.targetAllocation));
    upgradeSettingsRowToV8(row);

    expect(row.targetAllocation).toEqual(once);
  });
});

describe('upgradeSnapshotDataToV8', () => {
  it('upgrades every settings row in a snapshot', () => {
    const data: Record<string, unknown[] | undefined> = {
      settings: [{ id: SETTINGS_ID, baseCurrency: 'INR', ai: {} }],
    };
    upgradeSnapshotDataToV8(data);

    expect((data.settings as Record<string, unknown>[])[0].targetAllocation).toEqual([]);
  });

  it('seeds a settings row when the snapshot has none', () => {
    const data: Record<string, unknown[] | undefined> = {};
    upgradeSnapshotDataToV8(data);

    expect(data.settings).toHaveLength(1);
    const row = (data.settings as Record<string, unknown>[])[0];
    expect(row.id).toBe(SETTINGS_ID);
    expect(row.targetAllocation).toEqual([]);
    // The earlier steps own these, but a row this function invents must still
    // satisfy ISettings or the restore writes an unusable singleton.
    expect(row.ai).toEqual({});
    expect(Array.isArray(row.currencies)).toBe(true);
  });

  it('leaves an existing allocation alone', () => {
    const data: Record<string, unknown[] | undefined> = {
      settings: [
        {
          id: SETTINGS_ID,
          targetAllocation: [{ category: AssetCategory.GOLD, targetPercent: 15 }],
        },
      ],
    };
    upgradeSnapshotDataToV8(data);

    expect((data.settings as Record<string, unknown>[])[0].targetAllocation).toEqual([
      { category: AssetCategory.GOLD, targetPercent: 15 },
    ]);
  });
});
