import { withTransaction } from '@/data/database';
import { CurrencyRateRepository } from '@/data/repositories/settings/CurrencyRateRepository';
import { SettingsRepository } from '@/data/repositories/settings/SettingsRepository';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { CurrencyRate, ICurrencyRate } from '../entities/shared/CurrencyRate';
import { ISettings } from '../entities/shared/Settings';
import { Logger } from '../utils/Logger';
import { executeValueScript } from '../utils/ScriptExecutor';

/**
 * Owns the base currency and the exchange rates every cross-entity total is
 * reported through.
 *
 * Rates refresh on the same terms as an asset's value script: lazily, at most
 * once a day, and only written back when the number actually changed — a blind
 * daily write would push a fresh sync snapshot from every device for nothing.
 */
/**
 * When a script returns a rate that has not moved, nothing is written — so the
 * stored `scriptUpdatedAt` stays stale and the script would otherwise re-run on
 * every dashboard render. This session-scoped record holds it to one attempt per
 * currency per day without a write. It is deliberately not persisted: a fresh
 * app start re-checking an unchanged rate once is cheap.
 */
const lastScriptAttemptAt = new Map<Currency, number>();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;

export class CurrencyService {
  private readonly settingsRepository: SettingsRepository;
  private readonly currencyRateRepository: CurrencyRateRepository;

  constructor() {
    this.settingsRepository = new SettingsRepository();
    this.currencyRateRepository = new CurrencyRateRepository();
  }

  public async getSettings(): Promise<ISettings> {
    return await this.settingsRepository.get();
  }

  public async getBaseCurrency(): Promise<Currency> {
    return (await this.settingsRepository.get()).baseCurrency;
  }

  /**
   * Changing the base currency invalidates every stored rate: a row saying "88
   * units of base per USD" means something entirely different once the base is
   * USD, and a rate script fetching USD->INR would keep re-supplying the old
   * basis. Rather than rebase numbers that a script would immediately overwrite,
   * the rates are cleared so the user re-enters them against the new base. Until
   * they do, unrated currencies contribute 0 and the dashboard says so — the
   * failure is visible instead of a plausible wrong total.
   *
   * Callers must confirm with the user first; this is destructive.
   */
  public async setBaseCurrency(baseCurrency: Currency): Promise<ISettings> {
    const current = await this.settingsRepository.get();
    if (current.baseCurrency === baseCurrency) return current;

    return await withTransaction(async () => {
      await this.currencyRateRepository.clearAll();
      const saved = await this.settingsRepository.save({ ...current, baseCurrency });
      Logger.info(
        `Base currency changed from ${current.baseCurrency} to ${baseCurrency}; stored rates cleared`
      );
      return saved;
    });
  }

  public async getRates(): Promise<CurrencyRate[]> {
    const rates = await this.currencyRateRepository.getAll();
    return rates.map(rate => new CurrencyRate(rate));
  }

  public async saveRate(rate: ICurrencyRate): Promise<CurrencyRate> {
    const saved = await this.currencyRateRepository.save(rate);
    return new CurrencyRate(saved);
  }

  public async deleteRate(id: number): Promise<void> {
    await this.currencyRateRepository.delete(id);
  }

  /**
   * The converter used by every aggregate. `skipRateUpdate` suppresses script
   * execution for callers that only need the arithmetic and must not fire
   * network calls.
   */
  public async getConverter(
    options: { skipRateUpdate?: boolean } = {}
  ): Promise<CurrencyConverter> {
    const baseCurrency = await this.getBaseCurrency();
    if (!options.skipRateUpdate) {
      await this.updateRates();
    }

    const rates = await this.getRates();
    const perUnitInBase = new Map<Currency, number>();
    for (const rate of rates) {
      if (rate.code === baseCurrency) continue;
      const value = rate.getPerUnitInBase();
      if (value !== undefined) perUnitInBase.set(rate.code, value);
    }

    return new CurrencyConverter(baseCurrency, perUnitInBase);
  }

  /** Runs any rate script that has gone stale. Never throws. */
  public async updateRates(): Promise<void> {
    const rates = await this.getRates();
    for (const rate of rates) {
      await this.updateRate(rate);
    }
  }

  private async updateRate(rate: CurrencyRate): Promise<void> {
    if (!rate.needsScriptExecution()) return;

    const lastAttempt = lastScriptAttemptAt.get(rate.code);
    if (lastAttempt !== undefined && Date.now() - lastAttempt < ONE_DAY_MS) return;
    lastScriptAttemptAt.set(rate.code, Date.now());

    try {
      const value = await executeValueScript(rate.script!);
      if (value === undefined || !Number.isFinite(value) || value <= 0) {
        Logger.warn(`Rate script for ${rate.code} returned an unusable value, skipping update.`);
        return;
      }
      // Only a changed rate is worth a write: every write wakes auto-sync.
      if (value === rate.scriptPerUnitInBase) return;

      Logger.info(`Updating script rate for ${rate.code} to ${value}`);
      await this.currencyRateRepository.save({
        ...rate,
        scriptPerUnitInBase: value,
        scriptUpdatedAt: new Date(),
      });
    } catch (error) {
      Logger.warn(`Failed to update script rate for ${rate.code}:`, error);
    }
  }
}
