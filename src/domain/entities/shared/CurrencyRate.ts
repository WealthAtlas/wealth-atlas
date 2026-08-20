import { Currency } from './Currency';

/**
 * One stored exchange rate, for converting `code` into the configured base
 * currency.
 *
 * DIRECTION: `perUnitInBase` is how many units of the BASE currency one unit of
 * `code` is worth — with base INR, a USD row holds ~88, not ~0.0113. The field
 * names spell this out because an inverted rate is a silent ~7800x error that
 * no reviewer can spot from a field called `rate`.
 *
 * A rate can come from either source, mirroring how an asset's value works
 * (`Asset.getMarketValue`): a hand-entered number, or a user script re-run on a
 * 24 hour cadence. The more recently updated of the two wins.
 */
export interface ICurrencyRate {
  id?: number;
  code: Currency;
  manualPerUnitInBase: number | undefined;
  manualUpdatedAt: Date | undefined;
  /** Script exporting `getValue(): Promise<number>`, run by `executeValueScript`. */
  script: string | undefined;
  scriptPerUnitInBase: number | undefined;
  scriptUpdatedAt: Date | undefined;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class CurrencyRate implements ICurrencyRate {
  public readonly id?: number;
  public readonly code: Currency;
  public readonly manualPerUnitInBase: number | undefined;
  public readonly manualUpdatedAt: Date | undefined;
  public readonly script: string | undefined;
  public readonly scriptPerUnitInBase: number | undefined;
  public readonly scriptUpdatedAt: Date | undefined;

  constructor({
    id,
    code,
    manualPerUnitInBase,
    manualUpdatedAt,
    script,
    scriptPerUnitInBase,
    scriptUpdatedAt,
  }: ICurrencyRate) {
    this.id = id;
    this.code = code;
    this.manualPerUnitInBase = manualPerUnitInBase;
    this.manualUpdatedAt = manualUpdatedAt ? new Date(manualUpdatedAt) : undefined;
    this.script = script;
    this.scriptPerUnitInBase = scriptPerUnitInBase;
    this.scriptUpdatedAt = scriptUpdatedAt ? new Date(scriptUpdatedAt) : undefined;
  }

  /** Units of the base currency per one unit of `code`, or undefined if unset. */
  public getPerUnitInBase(): number | undefined {
    if (this.scriptPerUnitInBase && this.scriptUpdatedAt) {
      const scriptIsRecent = !this.manualUpdatedAt || this.scriptUpdatedAt >= this.manualUpdatedAt;
      if (scriptIsRecent) return this.scriptPerUnitInBase;
    }
    return this.manualPerUnitInBase;
  }

  /** When the rate now in effect was last set. */
  public getUpdatedAt(): Date | undefined {
    if (this.scriptPerUnitInBase && this.scriptUpdatedAt) {
      if (this.manualUpdatedAt === undefined) return this.scriptUpdatedAt;
      if (this.scriptUpdatedAt >= this.manualUpdatedAt) return this.scriptUpdatedAt;
    }
    return this.manualUpdatedAt;
  }

  public needsScriptExecution(): boolean {
    if (!this.script) return false;
    if (this.scriptPerUnitInBase === undefined || this.scriptUpdatedAt === undefined) return true;
    return new Date().getTime() - this.scriptUpdatedAt.getTime() > ONE_DAY_MS;
  }
}
