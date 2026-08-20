import { Currency, DEFAULT_CURRENCIES } from '@/domain/entities/shared/Currency';
import { SETTINGS_ID } from '@/domain/entities/shared/Settings';
import { describe, expect, it } from 'vitest';
import { upgradeSettingsRowToV6, upgradeSnapshotDataToV6 } from './v6';

describe('upgradeSettingsRowToV6', () => {
  it('gives a v5 row the currencies that used to be hardcoded', () => {
    const row: Record<string, unknown> = { id: SETTINGS_ID, baseCurrency: Currency.INR };
    upgradeSettingsRowToV6(row);

    expect(row.currencies).toEqual(DEFAULT_CURRENCIES);
  });

  it('keeps a list the user has already configured', () => {
    const row: Record<string, unknown> = {
      id: SETTINGS_ID,
      baseCurrency: Currency.USD,
      currencies: [Currency.USD, 'AED'],
    };
    upgradeSettingsRowToV6(row);

    expect(row.currencies).toEqual([Currency.USD, 'AED']);
  });

  it('adds the base currency to a list that omits it', () => {
    const row: Record<string, unknown> = {
      id: SETTINGS_ID,
      baseCurrency: Currency.GBP,
      currencies: [Currency.USD],
    };
    upgradeSettingsRowToV6(row);

    expect(row.currencies).toEqual([Currency.GBP, Currency.USD]);
  });

  it('drops entries that are not ISO codes', () => {
    const row: Record<string, unknown> = {
      id: SETTINGS_ID,
      baseCurrency: Currency.INR,
      currencies: [Currency.USD, 'rupees', 7, null],
    };
    upgradeSettingsRowToV6(row);

    expect(row.currencies).toEqual([Currency.INR, Currency.USD]);
  });

  it('repairs an unusable base currency', () => {
    const row: Record<string, unknown> = { id: SETTINGS_ID, baseCurrency: 'not a currency' };
    upgradeSettingsRowToV6(row);

    expect(row.baseCurrency).toBe(DEFAULT_CURRENCIES[0]);
    expect(row.currencies).toEqual(DEFAULT_CURRENCIES);
  });

  it('is idempotent', () => {
    const row: Record<string, unknown> = { id: SETTINGS_ID, baseCurrency: Currency.INR };
    upgradeSettingsRowToV6(row);
    const first = JSON.stringify(row);
    upgradeSettingsRowToV6(row);

    expect(JSON.stringify(row)).toBe(first);
  });
});

describe('upgradeSnapshotDataToV6', () => {
  it('upgrades the settings row a snapshot carries', () => {
    const data: Record<string, unknown[] | undefined> = {
      settings: [{ id: SETTINGS_ID, baseCurrency: Currency.GBP }],
    };
    upgradeSnapshotDataToV6(data);

    // Base currency first: it is what every total is labelled in.
    expect(data.settings).toEqual([
      {
        id: SETTINGS_ID,
        baseCurrency: Currency.GBP,
        currencies: [Currency.GBP, Currency.INR, Currency.USD],
      },
    ]);
  });

  it('supplies a settings row when the snapshot has none', () => {
    const data: Record<string, unknown[] | undefined> = {};
    upgradeSnapshotDataToV6(data);

    expect(data.settings).toEqual([
      {
        id: SETTINGS_ID,
        baseCurrency: DEFAULT_CURRENCIES[0],
        currencies: DEFAULT_CURRENCIES,
      },
    ]);
  });
});
