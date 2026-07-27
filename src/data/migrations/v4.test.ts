import { Currency } from '@/domain/entities/shared/Currency';
import { describe, expect, it } from 'vitest';
import { rehydrateSnapshotDates } from './rehydrateDates';
import {
  upgradeCurrencyBearingRowToV4,
  upgradeExpenseRowToV4,
  upgradeInvestmentRowToV4,
  upgradeSnapshotDataToV4,
} from './v4';

describe('upgradeInvestmentRowToV4', () => {
  it('renames price to totalAmount', () => {
    const row: Record<string, unknown> = { price: 1500, type: 'buy', quantity: 3 };
    upgradeInvestmentRowToV4(row);

    expect(row.totalAmount).toBe(1500);
    expect('price' in row).toBe(false);
  });

  it('flips a hand-entered negative sell to positive', () => {
    const row: Record<string, unknown> = { price: -800, type: 'sell', quantity: -4 };
    upgradeInvestmentRowToV4(row);

    expect(row.totalAmount).toBe(800);
    expect(row.quantity).toBe(4);
  });

  it('leaves an already-positive sell untouched', () => {
    const row: Record<string, unknown> = { price: 800, type: 'sell', quantity: 4 };
    upgradeInvestmentRowToV4(row);

    expect(row.totalAmount).toBe(800);
    expect(row.quantity).toBe(4);
  });

  it('leaves negative buys alone so existing totals do not shift', () => {
    const row: Record<string, unknown> = { price: -300, type: 'buy', quantity: -2 };
    upgradeInvestmentRowToV4(row);

    expect(row.totalAmount).toBe(-300);
    expect(row.quantity).toBe(-2);
  });

  it('defaults a missing type to buy', () => {
    const row: Record<string, unknown> = { price: 100 };
    upgradeInvestmentRowToV4(row);

    expect(row.type).toBe('buy');
  });

  it('is idempotent', () => {
    const row: Record<string, unknown> = { price: -800, type: 'sell', quantity: -4 };
    upgradeInvestmentRowToV4(row);
    const afterFirst = { ...row };
    upgradeInvestmentRowToV4(row);

    expect(row).toEqual(afterFirst);
  });
});

describe('upgradeExpenseRowToV4', () => {
  it.each([
    ['₹', Currency.INR],
    ['$', Currency.USD],
    ['£', Currency.GBP],
    ['INR', Currency.INR],
    ['usd', Currency.USD],
  ])('maps %s to %s', (input, expected) => {
    const row: Record<string, unknown> = { currency: input };
    upgradeExpenseRowToV4(row);

    expect(row.currency).toBe(expected);
  });

  it('falls back to INR for anything unrecognised', () => {
    const row: Record<string, unknown> = { currency: 'wat' };
    upgradeExpenseRowToV4(row);

    expect(row.currency).toBe(Currency.INR);
  });

  it('is idempotent', () => {
    const row: Record<string, unknown> = { currency: '₹' };
    upgradeExpenseRowToV4(row);
    upgradeExpenseRowToV4(row);

    expect(row.currency).toBe(Currency.INR);
  });
});

describe('upgradeCurrencyBearingRowToV4', () => {
  it('leaves rows without a currency alone', () => {
    const row: Record<string, unknown> = { name: 'Fund' };
    upgradeCurrencyBearingRowToV4(row);

    expect('currency' in row).toBe(false);
  });

  it('coerces a stray symbol on an asset row', () => {
    const row: Record<string, unknown> = { name: 'Fund', currency: '£' };
    upgradeCurrencyBearingRowToV4(row);

    expect(row.currency).toBe(Currency.GBP);
  });
});

describe('upgradeSnapshotDataToV4', () => {
  it('migrates every affected table and tolerates missing ones', () => {
    const data: Record<string, Record<string, unknown>[]> = {
      investments: [{ price: -50, type: 'sell', quantity: -1 }],
      expenses: [{ currency: '$' }],
      assets: [{ currency: 'INR' }],
    };

    expect(() => upgradeSnapshotDataToV4(data)).not.toThrow();
    expect(data.investments[0].totalAmount).toBe(50);
    expect(data.expenses[0].currency).toBe(Currency.USD);
    expect(data.assets[0].currency).toBe(Currency.INR);
  });
});

describe('rehydrateSnapshotDates', () => {
  it('turns ISO strings back into Date objects', () => {
    const data: Record<string, Record<string, unknown>[]> = {
      investments: [{ date: '2024-03-15T00:00:00.000Z' }],
      goals: [{ maturityDate: '2030-01-01T00:00:00.000Z', createdAt: '2024-01-01T00:00:00.000Z' }],
    };

    rehydrateSnapshotDates(data);

    expect(data.investments[0].date).toBeInstanceOf(Date);
    expect((data.investments[0].date as Date).toISOString()).toBe('2024-03-15T00:00:00.000Z');
    expect(data.goals[0].maturityDate).toBeInstanceOf(Date);
    expect(data.goals[0].createdAt).toBeInstanceOf(Date);
  });

  it('leaves existing Date objects as they are', () => {
    const existing = new Date('2024-06-01T00:00:00.000Z');
    const data: Record<string, Record<string, unknown>[]> = {
      expenses: [{ date: existing }],
    };

    rehydrateSnapshotDates(data);

    expect(data.expenses[0].date).toBe(existing);
  });

  it('maps absent and unparseable values to undefined', () => {
    const data: Record<string, Record<string, unknown>[]> = {
      sips: [{ startDate: '2024-01-01T00:00:00.000Z', endDate: '', lastGeneratedDate: 'nonsense' }],
    };

    rehydrateSnapshotDates(data);

    expect(data.sips[0].startDate).toBeInstanceOf(Date);
    expect(data.sips[0].endDate).toBeUndefined();
    expect(data.sips[0].lastGeneratedDate).toBeUndefined();
  });
});
