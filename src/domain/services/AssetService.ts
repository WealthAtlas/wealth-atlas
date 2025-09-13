import { AssetRepository } from '@/data/repositories/assets/AssetRepository';
import { InvestmentRepository } from '@/data/repositories/assets/InvestmentRepository';
import { SIPRepository } from '@/data/repositories/assets/SIPRepository';
import { Asset, IAsset } from '../entities/assets/Asset';
import { IInvestment, Investment } from '../entities/assets/Investment';
import { ISIP, SIP } from '../entities/assets/SIP';
import { Logger } from '../utils/Logger';
import { executeValueScript } from '../utils/ScriptExecutor';

export class AssetService {
  private readonly assetRepository: AssetRepository;
  private readonly investmentRepository: InvestmentRepository;
  private readonly sipRepository: SIPRepository;

  constructor() {
    this.assetRepository = new AssetRepository();
    this.investmentRepository = new InvestmentRepository();
    this.sipRepository = new SIPRepository();
  }

  public async createAsset(asset: IAsset): Promise<Asset> {
    const createdAsset = await this.assetRepository.create(asset);
    return this.toAsset(createdAsset);
  }

  public async updateAsset(asset: IAsset): Promise<Asset> {
    const updatedAsset = await this.assetRepository.update(asset);
    return this.toAsset(updatedAsset);
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
      .map(transaction => {
        return new Investment({
          ...transaction,
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
    return (await this.sipRepository.getByAssetId(assetId)).map(transaction => {
      return new SIP({
        ...transaction,
      });
    });
  }

  public async deleteSIP(id: number): Promise<void> {
    await this.investmentRepository.deleteBySipId(id);
    await this.sipRepository.delete(id);
  }

  public async updateValues(): Promise<void> {
    return await this.getAssets().then(async assets => {
      for (const asset of assets) {
        if (asset.needsScriptExecution()) {
          try {
            const newValue = await executeValueScript(asset.script!);
            if (newValue === undefined) continue;
            Logger.info(`Updating script value for ${asset.name} to ${newValue}`);
            const updatedAsset = {
              ...asset,
              scriptValue: newValue,
              scriptValueUpdatedAt: new Date(),
            };
            await this.assetRepository.update(updatedAsset);
          } catch (error) {
            Logger.warn(`Failed to update script value for ${asset.name}:`, error);
          }
        }
      }
    });
  }

  public async createSIPInvestments(): Promise<void> {
    return this.getAssets().then(async assets => {
      for (const asset of assets) {
        const sips = await this.getSIPsByAssetId(asset.id!);
        for (const sip of sips) {
          const pendingInvestments = sip.getPendingOccurences(new Date());
          for (const investment of pendingInvestments) {
            await this.investmentRepository.create(investment);
          }

          // Update the lastGeneratedDate to the latest payment date
          if (pendingInvestments.length === 0) continue;
          const latestPaymentDate = pendingInvestments[pendingInvestments.length - 1].date;
          await this.sipRepository.update({
            ...sip,
            lastGeneratedDate: latestPaymentDate,
          });
        }
      }
    });
  }

  private async toAsset(data: IAsset): Promise<Asset> {
    const investments = await this.getInvestmentByAssetId(data.id!);
    const sips = await this.getSIPsByAssetId(data.id!);
    return new Asset({
      ...data,
      investments: investments,
      sips,
    });
  }
}
