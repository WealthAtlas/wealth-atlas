import { describe, expect, it } from 'vitest';
import { Currency } from './Currency';
import { parseCurrencyConfig, serializeCurrencyConfig } from './CurrencyConfig';
import { CurrencyRate, ICurrencyRate } from './CurrencyRate';

function rate(overrides: Partial<ICurrencyRate> & { code: Currency }): CurrencyRate {
  return new CurrencyRate({
    id: 1,
    manualPerUnitInBase: undefined,
    manualUpdatedAt: undefined,
    script: undefined,
    scriptPerUnitInBase: undefined,
    scriptUpdatedAt: undefined,
    ...overrides,
  });
}

function parse(text: string, base: Currency = Currency.INR) {
  return parseCurrencyConfig(text, base);
}

describe('parseCurrencyConfig', () => {
  it('reads a currency list and a plain rate map', () => {
    const { config, issues } = parse('{"currencies":["INR","USD"],"rates":{"USD":88.42}}');

    expect(issues).toEqual([]);
    expect(config?.currencies).toEqual([Currency.INR, Currency.USD]);
    expect(config?.rates).toEqual([{ code: 'USD', perUnitInBase: 88.42, script: undefined }]);
  });

  it('accepts a currency the app never shipped', () => {
    const { config, issues } = parse('{"currencies":["INR","AED"],"rates":{"AED":24.1}}');

    expect(issues).toEqual([]);
    expect(config?.currencies).toContain('AED');
  });

  it('upper-cases codes so "usd" is not a second currency', () => {
    const { config } = parse('{"currencies":["inr","usd"],"rates":{"usd":88}}');

    expect(config?.currencies).toEqual(['INR', 'USD']);
    expect(config?.rates[0].code).toBe('USD');
  });

  it('always keeps the base currency in the list, even when omitted', () => {
    const { config } = parse('{"currencies":["USD"],"rates":{"USD":88}}');

    expect(config?.currencies).toEqual([Currency.INR, Currency.USD]);
  });

  it('reads the long form, so a rate script survives a round trip', () => {
    const { config, issues } = parse(
      '{"currencies":["INR","USD"],"rates":{"USD":{"rate":88,"script":"export async function getValue(){return 88}"}}}'
    );

    expect(issues).toEqual([]);
    expect(config?.rates[0]).toEqual({
      code: 'USD',
      perUnitInBase: 88,
      script: 'export async function getValue(){return 88}',
    });
  });

  it('accepts a script with no rate yet', () => {
    const { config, issues } = parse(
      '{"currencies":["INR","USD"],"rates":{"USD":{"script":"export async function getValue(){}"}}}'
    );

    expect(issues).toEqual([]);
    expect(config?.rates[0].perUnitInBase).toBeUndefined();
  });

  it('rejects a currency listed with no rate at all in the long form', () => {
    const { config, issues } = parse('{"currencies":["INR","USD"],"rates":{"USD":{}}}');

    expect(config).toBeUndefined();
    expect(issues).toEqual(['USD: give a rate, a script, or remove the entry.']);
  });

  it('leaves a listed currency without an entry unrated rather than failing', () => {
    const { config, issues } = parse('{"currencies":["INR","USD","GBP"],"rates":{"USD":88}}');

    expect(issues).toEqual([]);
    expect(config?.currencies).toContain('GBP');
    expect(config?.rates.map(entry => entry.code)).toEqual(['USD']);
  });

  it('rejects a rate that is zero, negative or not a number', () => {
    expect(parse('{"currencies":["INR","USD"],"rates":{"USD":0}}').issues).toEqual([
      'USD: the rate must be a number greater than 0.',
    ]);
    expect(parse('{"currencies":["INR","USD"],"rates":{"USD":-5}}').issues).toEqual([
      'USD: the rate must be a number greater than 0.',
    ]);
    expect(parse('{"currencies":["INR","USD"],"rates":{"USD":"88"}}').issues).toEqual([
      'USD: expected a number, or an object with "rate" and/or "script".',
    ]);
  });

  it('rejects a rate for the base currency, which needs none', () => {
    const { issues } = parse('{"currencies":["INR","USD"],"rates":{"INR":1,"USD":88}}');

    expect(issues).toEqual([
      'INR is the base currency, so it needs no rate. Remove it from "rates".',
    ]);
  });

  it('rejects a rate for a currency that is not in the list', () => {
    const { issues } = parse('{"currencies":["INR"],"rates":{"USD":88}}');

    expect(issues).toEqual([
      'USD has a rate but is not in "currencies". Add it to the list first.',
    ]);
  });

  it('rejects something that is not an ISO code', () => {
    const { issues } = parse('{"currencies":["INR","DOLLARS"],"rates":{}}');

    expect(issues).toEqual(['"DOLLARS" is not a three-letter ISO currency code.']);
  });

  it('reports a mistyped key rather than silently ignoring it', () => {
    const { issues } = parse('{"currencies":["INR"],"rate":{}}');

    expect(issues).toEqual(['Unexpected key "rate". Only currencies and rates are used.']);
  });

  it('reports every problem at once, so one save fixes them all', () => {
    const { issues } = parse('{"currencies":["INR","XX"],"rates":{"USD":88}}');

    expect(issues).toHaveLength(2);
  });

  it('explains malformed JSON instead of throwing', () => {
    const { config, issues } = parse('{"currencies":[');

    expect(config).toBeUndefined();
    expect(issues[0]).toContain('Not valid JSON');
  });

  it('rejects a document that is not an object', () => {
    expect(parse('[]').issues).toEqual(['Expected a JSON object with "currencies" and "rates".']);
    expect(parse('42').issues).toEqual(['Expected a JSON object with "currencies" and "rates".']);
  });

  it('asks for the currency list when it is missing', () => {
    const { issues } = parse('{"rates":{}}');

    expect(issues).toEqual(['Missing "currencies": a list of ISO codes, such as ["INR", "USD"].']);
  });
});

describe('serializeCurrencyConfig', () => {
  it('writes a bare number for a hand-entered rate', () => {
    const text = serializeCurrencyConfig(
      [Currency.INR, Currency.USD],
      [rate({ code: Currency.USD, manualPerUnitInBase: 88.42, manualUpdatedAt: new Date() })],
      Currency.INR
    );

    expect(JSON.parse(text)).toEqual({
      currencies: ['INR', 'USD'],
      rates: { USD: 88.42 },
    });
  });

  it('writes the long form when there is a script to preserve', () => {
    const text = serializeCurrencyConfig(
      [Currency.INR, Currency.USD],
      [
        rate({
          code: Currency.USD,
          script: 'export async function getValue(){return 88}',
          scriptPerUnitInBase: 88,
          scriptUpdatedAt: new Date(),
        }),
      ],
      Currency.INR
    );

    expect(JSON.parse(text).rates.USD).toEqual({
      rate: 88,
      script: 'export async function getValue(){return 88}',
    });
  });

  it('omits the base currency and any currency with no rate', () => {
    const text = serializeCurrencyConfig(
      [Currency.INR, Currency.USD, Currency.GBP],
      [rate({ code: Currency.USD, manualPerUnitInBase: 88 })],
      Currency.INR
    );

    const parsed = JSON.parse(text);
    expect(parsed.currencies).toEqual(['INR', 'USD', 'GBP']);
    expect(parsed.rates).toEqual({ USD: 88 });
  });

  it('round-trips through the parser unchanged', () => {
    const currencies = [Currency.INR, Currency.USD, Currency.GBP];
    const rates = [
      rate({ code: Currency.USD, manualPerUnitInBase: 88.42, manualUpdatedAt: new Date() }),
      rate({
        code: Currency.GBP,
        script: 'export async function getValue(){return 112}',
        scriptPerUnitInBase: 112,
        scriptUpdatedAt: new Date(),
      }),
    ];

    const { config, issues } = parseCurrencyConfig(
      serializeCurrencyConfig(currencies, rates, Currency.INR),
      Currency.INR
    );

    expect(issues).toEqual([]);
    expect(config?.currencies).toEqual(currencies);
    expect(config?.rates).toEqual([
      { code: 'USD', perUnitInBase: 88.42, script: undefined },
      { code: 'GBP', perUnitInBase: 112, script: 'export async function getValue(){return 112}' },
    ]);
  });
});
