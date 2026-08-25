import { AutoSyncService } from '@/data/sync/AutoSyncService';
import { AssetRepository } from '@/data/repositories/assets/AssetRepository';
import { InvestmentRepository } from '@/data/repositories/assets/InvestmentRepository';
import { SIPRepository } from '@/data/repositories/assets/SIPRepository';
import { Asset, IAsset } from '../entities/assets/Asset';
import { IInvestment, Investment } from '../entities/assets/Investment';
import { ISIP, SIP } from '../entities/assets/SIP';
import { Currency } from '../entities/shared/Currency';
import { CurrencyConverter } from '../entities/shared/CurrencyConverter';
import { Logger } from '../utils/Logger';
import { processSchedules } from '../utils/ScheduleProcessor';
import { executeValueScript } from '../utils/ScriptExecutor';

/**
 * Portfolio totals across assets that may each be in a different currency, so
 * every amount converts to the base currency before it is summed.
 */
export interface AssetPortfolioTotals {
  totalValue: number;
  totalInvested: number;
  totalProfitLoss: number;
  totalProfitLossPercentage: number;
  currency: Currency;
  /** Currencies with no rate, whose holdings contributed 0 to the figures above. */
  unratedCurrencies: Currency[];
}

export function computeAssetPortfolioTotals(
  assets: Asset[],
  converter: CurrencyConverter
): AssetPortfolioTotals {
  const totalValue = assets.reduce(
    (sum, asset) => sum + converter.toBase(asset.getValue() || 0, asset.currency),
    0
  );
  const totalInvested = assets.reduce(
    (sum, asset) => sum + converter.toBase(asset.getTotalInvestedAmount(), asset.currency),
    0
  );
  const totalProfitLoss = totalValue - totalInvested;

  return {
    totalValue,
    totalInvested,
    totalProfitLoss,
    totalProfitLossPercentage: totalInvested > 0 ? (totalProfitLoss / totalInvested) * 100 : 0,
    currency: converter.getBaseCurrency(),
    unratedCurrencies: converter.getUnratedCurrencies(assets.map(asset => asset.currency)),
  };
}

export class AssetService {
  private readonly assetRepository: AssetRepository;
  private readonly investmentRepository: InvestmentRepository;
  private readonly sipRepository: SIPRepository;

  constructor() {
    this.assetRepository = new AssetRepository();
    this.investmentRepository = new InvestmentRepository();
    this.sipRepository = new SIPRepository();
  }

  /**
   * `skipValueUpdate` suppresses the per-asset value-script execution, which
   * otherwise fires a network call for every asset. Bulk callers (the AI
   * importer) pass it and run `updateValues()` once at the end instead.
   */
  public async createAsset(
    asset: IAsset,
    options: { skipValueUpdate?: boolean } = {}
  ): Promise<Asset> {
    const createdAsset = await this.assetRepository.create(asset).then(a => this.toAsset(a));
    if (!options.skipValueUpdate) {
      await this.updateValue(createdAsset);
    }
    return createdAsset;
  }

  public async updateAsset(asset: IAsset): Promise<Asset> {
    const updatedAsset = await this.assetRepository.update(asset).then(a => this.toAsset(a));
    await this.updateValue(updatedAsset);
    return updatedAsset;
  }

  public async deleteAsset(id: number): Promise<void> {
    await this.assetRepository
      .delete(id)
      .then(() => this.investmentRepository.deleteByAssetId(id))
      .then(() => this.sipRepository.deleteByAssetId(id));
  }

  public async getAssetById(id: number): Promise<Asset> {
    return await this.assetRepository.getById(id).then(async asset => {
      return this.toAsset(asset);
    });
  }

  public async getAssets(): Promise<Asset[]> {
    const assets = (await this.assetRepository.getAll()).sort((a, b) => {
      if (a.manualValue !== undefined && b.manualValue !== undefined) {
        return b.manualValue - a.manualValue;
      } else {
        return a.name.localeCompare(b.name);
      }
    });
    return Promise.all(
      assets.map(async asset => {
        return this.toAsset(asset);
      })
    );
  }

  public async addInvestment(investment: IInvestment): Promise<Investment> {
    const createdTransaction = await this.investmentRepository.create(investment);
    return new Investment({
      ...createdTransaction,
    });
  }

  public async updateInvestment(investment: IInvestment): Promise<Investment> {
    const updatedTransaction = await this.investmentRepository.update(investment);
    return new Investment({
      ...updatedTransaction,
    });
  }

  public async getInvestmentByAssetId(assetId: number): Promise<Investment[]> {
    return (await this.investmentRepository.getByAssetId(assetId))
      .map(investment => {
        return new Investment({
          ...investment,
        });
      })
      .sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  public async deleteInvestment(id: number): Promise<void> {
    await this.investmentRepository.delete(id);
  }

  public async addSIP(sip: ISIP): Promise<SIP> {
    const createdTransaction = await this.sipRepository.create(sip);
    return new SIP({
      ...createdTransaction,
    });
  }

  public async updateSIP(sip: ISIP): Promise<SIP> {
    await this.investmentRepository.deleteBySipId(sip.id!);
    const updatedTransaction = await this.sipRepository.update(sip);
    return new SIP({
      ...updatedTransaction,
    });
  }

  public async getSIPsByAssetId(assetId: number): Promise<SIP[]> {
    return (await this.sipRepository.getByAssetId(assetId)).map(sip => {
      return new SIP({
        ...sip,
      });
    });
  }

  public async deleteSIP(id: number): Promise<void> {
    await this.investmentRepository.deleteBySipId(id);
    await this.sipRepository.delete(id);
  }

  /**
   * Refreshes one asset's script value.
   *
   * The write is suppressed and the script run is not, and the split is the
   * point. Suppression is a global flag, not something scoped to the work that
   * asked for it, so anything it spans is claimed as automatic — including an
   * edit the *user* makes in the meantime, which then gets no new `updatedAt`
   * and no unpushed mark, and is silently overwritten by the next merge. Holding
   * it across a script that fetches a price left that window open for as long as
   * the network took, once per asset, on every launch.
   *
   * The write itself does belong under it: a value refresh is not the user
   * changing their mind, so it must neither wake a push nor outrank a real edit
   * made on another device.
   */
  private async updateValue(asset: Asset): Promise<void> {
    if (asset.needsScriptExecution()) {
      try {
        const newValue = await executeValueScript(asset.script!);
        if (newValue === undefined) {
          Logger.warn(`Script for ${asset.name} returned undefined value, skipping update.`);
          return;
        }
        Logger.info(`Updating script value for ${asset.name} to ${newValue}`);
        const updatedAsset = {
          ...asset,
          scriptValue: newValue,
          scriptValueUpdatedAt: new Date(),
        };
        await AutoSyncService.withoutScheduling(() => this.assetRepository.update(updatedAsset));
      } catch (error) {
        Logger.warn(`Failed to update script value for ${asset.name}:`, error);
      }
    }
  }

  public async updateValues(): Promise<void> {
    return await this.getAssets().then(async assets => {
      for (const asset of assets) {
        await this.updateValue(asset);
      }
    });
  }

  public async createSIPInvestments(): Promise<void> {
    const assets = await this.getAssets();
    const allSips = (await Promise.all(assets.map(a => this.getSIPsByAssetId(a.id!)))).flat();
    const entries = allSips.map(sip => ({
      schedule: sip,
      occurrences: sip.getPendingOccurrences(new Date()),
    }));
    await processSchedules(
      entries,
      investment => this.investmentRepository.create(investment),
      (sip, lastGeneratedDate) => this.sipRepository.update({ ...sip, lastGeneratedDate })
    );
  }

  private async toAsset(data: IAsset): Promise<Asset> {
    const investments = (await this.getInvestmentByAssetId(data.id!)).map(
      inv => new Investment(inv)
    );
    const sips = (await this.getSIPsByAssetId(data.id!)).map(sip => new SIP(sip));
    return new Asset({
      ...data,
      investments: investments,
      sips,
    });
  }
}
