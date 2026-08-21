import { DEFAULT_CURRENCIES } from '@/domain/entities/shared/Currency';
import { SETTINGS_ID } from '@/domain/entities/shared/Settings';
import { describe, expect, it } from 'vitest';
import { upgradeSettingsRowToV7, upgradeSnapshotDataToV7 } from './v7';

describe('upgradeSettingsRowToV7', () => {
  it('gives a v6 row an empty AI block to hold the provider config', () => {
    const row: Record<string, unknown> = { id: SETTINGS_ID, baseCurrency: 'INR' };
    upgradeSettingsRowToV7(row);

    expect(row.ai).toEqual({});
  });

  it('keeps a provider config that is already there', () => {
    const ai = { presetId: 'openrouter', baseUrl: 'https://x/v1', apiKey: 'sk-1', model: 'm' };
    const row: Record<string, unknown> = { id: SETTINGS_ID, ai: { ...ai } };
    upgradeSettingsRowToV7(row);

    expect(row.ai).toEqual(ai);
  });

  it('drops blank and non-string fields so unset always reads as undefined', () => {
    const row: Record<string, unknown> = {
      id: SETTINGS_ID,
      ai: { presetId: 'ollama', baseUrl: '   ', apiKey: 42, model: null, junk: 'x' },
    };
    upgradeSettingsRowToV7(row);

    expect(row.ai).toEqual({ presetId: 'ollama' });
  });

  it('trims the values a paste tends to bring whitespace with', () => {
    const row: Record<string, unknown> = { id: SETTINGS_ID, ai: { apiKey: ' sk-2\n' } };
    upgradeSettingsRowToV7(row);

    expect(row.ai).toEqual({ apiKey: 'sk-2' });
  });

  it('is idempotent', () => {
    const row: Record<string, unknown> = { id: SETTINGS_ID, ai: { model: 'gpt-4o-mini' } };
    upgradeSettingsRowToV7(row);
    const once = { ...(row.ai as object) };
    upgradeSettingsRowToV7(row);

    expect(row.ai).toEqual(once);
  });
});

describe('upgradeSnapshotDataToV7', () => {
  it('upgrades every settings row in the snapshot', () => {
    const data: Record<string, unknown[] | undefined> = {
      settings: [{ id: SETTINGS_ID, baseCurrency: 'USD', currencies: ['USD'] }],
    };
    upgradeSnapshotDataToV7(data);

    expect(data.settings).toEqual([
      { id: SETTINGS_ID, baseCurrency: 'USD', currencies: ['USD'], ai: {} },
    ]);
  });

  it('seeds a settings row when the snapshot predates the table', () => {
    const data: Record<string, unknown[] | undefined> = { settings: [] };
    upgradeSnapshotDataToV7(data);

    expect(data.settings).toEqual([
      {
        id: SETTINGS_ID,
        baseCurrency: DEFAULT_CURRENCIES[0],
        currencies: DEFAULT_CURRENCIES,
        ai: {},
      },
    ]);
  });
});
