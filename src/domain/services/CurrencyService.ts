import { withTransaction } from '@/data/database';
import { CurrencyRateRepository } from '@/data/repositories/settings/CurrencyRateRepository';
import { SettingsRepository } from '@/data/repositories/settings/SettingsRepository';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { CurrencyConfig } from '../entities/shared/CurrencyConfig';
import { CurrencyRate, ICurrencyRate } from '../entities/shared/CurrencyRate';
import { ISettings, normaliseCurrencies } from '../entities/shared/Settings';
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

  /** The codes this user's data may use. Always includes the base currency. */
  public async getCurrencies(): Promise<Currency[]> {
    const settings = await this.settingsRepository.get();
    return normaliseCurrencies(settings.currencies, settings.baseCurrency);
  }

  /**
   * Everything a render needs, read together so the converter and the currency
   * pickers can never disagree about the base currency.
   */
  public async getCurrencyState(
    options: { skipRateUpdate?: boolean } = {}
  ): Promise<{ converter: CurrencyConverter; currencies: Currency[] }> {
    if (!options.skipRateUpdate) {
      await this.updateRates();
    }

    const settings = await this.settingsRepository.get();
    const rates = await this.getRates();

    return {
      converter: this.buildConverter(settings.baseCurrency, rates),
      currencies: normaliseCurrencies(settings.currencies, settings.baseCurrency),
    };
  }

  /**
   * Replaces the currency list and every rate in one go — the shape the JSON
   * editor in Settings saves. Rates for currencies that are no longer configured
   * are deleted rather than left behind to reappear if the code is re-added.
   */
  public async saveConfig(config: CurrencyConfig): Promise<ISettings> {
    const current = await this.settingsRepository.get();
    const currencies = normaliseCurrencies(config.currencies, current.baseCurrency);

    return await withTransaction(async () => {
      const existing = await this.currencyRateRepository.getAll();

      for (const rate of existing) {
        const stillConfigured = config.rates.some(candidate => candidate.code === rate.code);
        if (!stillConfigured && rate.id !== undefined) {
          await this.currencyRateRepository.delete(rate.id);
        }
      }

      for (const rate of config.rates) {
        const previous = existing.find(candidate => candidate.code === rate.code);
        const manualChanged = rate.perUnitInBase !== previous?.manualPerUnitInBase;
        await this.currencyRateRepository.save({
          id: previous?.id,
          code: rate.code,
          manualPerUnitInBase: rate.perUnitInBase,
          // A hand-entered rate only wins over the last script run if it is the
          // more recent of the two, so an edited number is stamped now.
          manualUpdatedAt:
            rate.perUnitInBase !== undefined && manualChanged
              ? new Date()
              : previous?.manualUpdatedAt,
          script: rate.script,
          // A rewritten script invalidates the value the old one produced.
          scriptPerUnitInBase:
            rate.script === previous?.script ? previous?.scriptPerUnitInBase : undefined,
          scriptUpdatedAt: rate.script === previous?.script ? previous?.scriptUpdatedAt : undefined,
        });
      }

      return await this.settingsRepository.save({ ...current, currencies });
    });
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
    return (await this.getCurrencyState(options)).converter;
  }

  private buildConverter(baseCurrency: Currency, rates: CurrencyRate[]): CurrencyConverter {
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
