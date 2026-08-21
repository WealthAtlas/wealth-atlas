import { Currency } from '@/domain/entities/shared/Currency';
import { defaultSettings, SETTINGS_ID } from '@/domain/entities/shared/Settings';
import { describe, expect, it } from 'vitest';
import { rehydrateSnapshotDates } from './rehydrateDates';
import { seedSettingsRows, upgradeSnapshotDataToV5, V5SettingsRow } from './v5';

describe('seedSettingsRows', () => {
  it('seeds the default base currency when there is no settings row', () => {
    expect(seedSettingsRows(undefined)).toEqual([defaultSettings()]);
    expect(seedSettingsRows([])).toEqual([defaultSettings()]);
  });

  it('keeps a base currency the user has already chosen', () => {
    const existing: V5SettingsRow = { id: SETTINGS_ID, baseCurrency: Currency.GBP };

    expect(seedSettingsRows([existing])).toEqual([existing]);
  });

  it('replaces an unusable base currency rather than leaving totals unlabelled', () => {
    const broken = [{ id: SETTINGS_ID, baseCurrency: 'not a currency' }];

    expect(seedSettingsRows(broken)).toEqual([defaultSettings()]);
  });

  it('collapses stray rows onto the singleton', () => {
    const rows = [
      { id: 7, baseCurrency: Currency.USD },
      { id: SETTINGS_ID, baseCurrency: Currency.GBP },
    ];

    expect(seedSettingsRows(rows)).toEqual([{ id: SETTINGS_ID, baseCurrency: Currency.GBP }]);
  });
});

describe('upgradeSnapshotDataToV5', () => {
  it('adds both new tables to a snapshot that predates them', () => {
    const data: Record<string, unknown[] | undefined> = { assets: [], expenses: [] };
    upgradeSnapshotDataToV5(data);

    expect(data.settings).toEqual([defaultSettings()]);
    expect(data.currencyRates).toEqual([]);
  });

  it('leaves existing rates alone', () => {
    const rates = [{ id: 1, code: Currency.USD, manualPerUnitInBase: 88 }];
    const data: Record<string, unknown[] | undefined> = {
      settings: [{ id: SETTINGS_ID, baseCurrency: Currency.USD }],
      currencyRates: rates,
    };
    upgradeSnapshotDataToV5(data);

    expect(data.settings).toEqual([{ id: SETTINGS_ID, baseCurrency: Currency.USD }]);
    expect(data.currencyRates).toBe(rates);
  });

  it('is idempotent', () => {
    const data: Record<string, unknown[] | undefined> = {};
    upgradeSnapshotDataToV5(data);
    const first = JSON.stringify(data);
    upgradeSnapshotDataToV5(data);

    expect(JSON.stringify(data)).toBe(first);
  });
});

describe('rehydrateSnapshotDates for currency rates', () => {
  it('turns the rate timestamps back into Dates', () => {
    const data = {
      currencyRates: [
        {
          id: 1,
          code: Currency.USD,
          manualPerUnitInBase: 88,
          manualUpdatedAt: '2026-08-01T00:00:00.000Z',
          scriptUpdatedAt: '2026-08-19T00:00:00.000Z',
        },
      ],
    };
    rehydrateSnapshotDates(data as never);

    expect(data.currencyRates[0].manualUpdatedAt).toBeInstanceOf(Date);
    expect(data.currencyRates[0].scriptUpdatedAt).toBeInstanceOf(Date);
  });
});
