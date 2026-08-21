import { describe, expect, it } from 'vitest';
import { Currency } from './Currency';
import { CurrencyRate, ICurrencyRate } from './CurrencyRate';

const BASE: ICurrencyRate = {
  id: 1,
  code: Currency.USD,
  manualPerUnitInBase: undefined,
  manualUpdatedAt: undefined,
  script: undefined,
  scriptPerUnitInBase: undefined,
  scriptUpdatedAt: undefined,
};

function hoursAgo(hours: number): Date {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

describe('CurrencyRate.getPerUnitInBase', () => {
  it('is undefined when neither source has supplied a rate', () => {
    expect(new CurrencyRate(BASE).getPerUnitInBase()).toBeUndefined();
  });

  it('uses the manual rate when there is no script rate', () => {
    const rate = new CurrencyRate({
      ...BASE,
      manualPerUnitInBase: 87,
      manualUpdatedAt: hoursAgo(2),
    });

    expect(rate.getPerUnitInBase()).toBe(87);
  });

  it('prefers the script rate when it is the more recent of the two', () => {
    const rate = new CurrencyRate({
      ...BASE,
      manualPerUnitInBase: 87,
      manualUpdatedAt: hoursAgo(48),
      scriptPerUnitInBase: 88.4,
      scriptUpdatedAt: hoursAgo(1),
    });

    expect(rate.getPerUnitInBase()).toBe(88.4);
    expect(rate.getUpdatedAt()).toEqual(rate.scriptUpdatedAt);
  });

  it('prefers a hand-entered rate saved after the last script run', () => {
    const rate = new CurrencyRate({
      ...BASE,
      manualPerUnitInBase: 90,
      manualUpdatedAt: hoursAgo(1),
      scriptPerUnitInBase: 88.4,
      scriptUpdatedAt: hoursAgo(48),
    });

    expect(rate.getPerUnitInBase()).toBe(90);
    expect(rate.getUpdatedAt()).toEqual(rate.manualUpdatedAt);
  });
});

describe('CurrencyRate.needsScriptExecution', () => {
  it('is false without a script', () => {
    expect(new CurrencyRate({ ...BASE, manualPerUnitInBase: 88 }).needsScriptExecution()).toBe(
      false
    );
  });

  it('is true for a script that has never run', () => {
    expect(new CurrencyRate({ ...BASE, script: 'export...' }).needsScriptExecution()).toBe(true);
  });

  it('is false while the last run is under a day old', () => {
    const rate = new CurrencyRate({
      ...BASE,
      script: 'export...',
      scriptPerUnitInBase: 88,
      scriptUpdatedAt: hoursAgo(6),
    });

    expect(rate.needsScriptExecution()).toBe(false);
  });

  it('is true once the last run is over a day old', () => {
    const rate = new CurrencyRate({
      ...BASE,
      script: 'export...',
      scriptPerUnitInBase: 88,
      scriptUpdatedAt: hoursAgo(30),
    });

    expect(rate.needsScriptExecution()).toBe(true);
  });
});
