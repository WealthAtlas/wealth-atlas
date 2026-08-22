import { SettingsRepository } from '@/data/repositories/settings/SettingsRepository';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { ICategoryTarget, normaliseTargetAllocation } from '../entities/shared/Settings';
import { AllocationDrift, computeAllocationDrift } from '../market/AllocationDrift';
import { summariseIssues } from '../validation/ValidationIssue';
import { validateTargetAllocation } from '../validation/EntityValidators';
import { AssetService } from './AssetService';

/**
 * The user's intended allocation, and how far the portfolio has drifted from it.
 *
 * Owns a piece of the settings singleton rather than a table of its own: the
 * shares are only meaningful as a set, so they are read and written whole. That
 * also means the allocation travels through sync and backup with everything
 * else in Settings, and that `db.settings` was already in the auto-sync hook
 * list — no new table to register.
 *
 * Writes are validated and rejected, not silently corrected. A target set that
 * adds up to 130% would make every drift figure wrong, and the assistant would
 * then quote those figures as fact.
 */
export class AllocationPolicyService {
  private readonly settingsRepository: SettingsRepository;
  private readonly assetService: AssetService;

  constructor() {
    this.settingsRepository = new SettingsRepository();
    this.assetService = new AssetService();
  }

  /** Empty until the user sets a policy — which is a state, not a failure. */
  public async getTargetAllocation(): Promise<ICategoryTarget[]> {
    const settings = await this.settingsRepository.get();
    return normaliseTargetAllocation(settings.targetAllocation);
  }

  /**
   * Replaces the whole allocation. Partial updates are not offered on purpose:
   * changing one category's share changes what every other share means.
   */
  public async saveTargetAllocation(targets: ICategoryTarget[]): Promise<ICategoryTarget[]> {
    const normalised = normaliseTargetAllocation(targets);
    const issues = validateTargetAllocation(normalised);
    if (issues.length > 0) {
      throw new Error(`Target allocation is not valid — ${summariseIssues(issues)}`);
    }

    const settings = await this.settingsRepository.get();
    await this.settingsRepository.save({ ...settings, targetAllocation: normalised });
    return normalised;
  }

  /**
   * Drift against the stored policy, or undefined when none is set. Undefined
   * rather than an all-zero report: "you are on target" and "you never said what
   * the target was" are different answers, and only one of them permits acting.
   */
  public async getDrift(converter: CurrencyConverter): Promise<AllocationDrift | undefined> {
    const targets = await this.getTargetAllocation();
    if (targets.length === 0) return undefined;

    return computeAllocationDrift(await this.assetService.getAssets(), targets, converter);
  }
}
