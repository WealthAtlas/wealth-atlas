import { ValueFetcher } from '@/data/apis/ValueFetcher';
import { AssetRepository } from '@/data/repositories/assets/AssetRepository';
import { InvestmentRepository } from '@/data/repositories/assets/InvestmentRepository';
import { SIPRepository } from '@/data/repositories/assets/SIPRepository';
import { Asset, IAsset } from '../entities/assets/Asset';
import { IInvestment, Investment } from '../entities/assets/Investment';
import { ISIP, SIP } from '../entities/assets/SIP';

export class AssetService {
  private readonly assetRepository: AssetRepository;
  private readonly inestmentRepository: InvestmentRepository;
  private readonly sipRepository: SIPRepository;
  private readonly valueFetcher: ValueFetcher;

  constructor() {
    this.assetRepository = new AssetRepository();
    this.inestmentRepository = new InvestmentRepository();
    this.sipRepository = new SIPRepository();
    this.valueFetcher = new ValueFetcher();
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
      .then(() => this.inestmentRepository.deleteByAssetId(id))
      .then(() => this.sipRepository.deleteByAssetId(id));
  }

  public async getAssetById(id: number): Promise<Asset> {
    return await this.assetRepository.getById(id).then(async asset => {
      return this.toAsset(asset);
    });
  }

  public async getAssets(): Promise<Asset[]> {
    const assets = await this.assetRepository.getAll();
    return Promise.all(
      assets.map(async asset => {
        return this.toAsset(asset);
      })
    );
  }

  public async addInvestment(investment: IInvestment): Promise<Investment> {
    const createdTransaction = await this.inestmentRepository.create(investment);
    return new Investment({
      ...createdTransaction,
    });
  }

  public async updateInvestment(investment: IInvestment): Promise<Investment> {
    const updatedTransaction = await this.inestmentRepository.update(investment);
    return new Investment({
      ...updatedTransaction,
    });
  }

  public async getInvestmentByAssetId(assetId: number): Promise<Investment[]> {
    return (await this.inestmentRepository.getByAssetId(assetId)).map(transaction => {
      return new Investment({
        ...transaction,
      });
    });
  }

  public async deleteInvestment(id: number): Promise<void> {
    await this.inestmentRepository.delete(id);
  }

  public async addSIP(sip: ISIP): Promise<SIP> {
    const createdTransaction = await this.sipRepository.create(sip);
    return new SIP({
      ...createdTransaction,
    });
  }

  public async updateSIP(sip: ISIP): Promise<SIP> {
    const updatedTransaction = await this.sipRepository.update(sip);
    return new SIP({
      ...updatedTransaction,
    });
  }

  public async getSIPByAssetId(assetId: number): Promise<SIP[]> {
    return (await this.sipRepository.getByAssetId(assetId)).map(transaction => {
      return new SIP({
        ...transaction,
      });
    });
  }

  public async deleteSIP(id: number): Promise<void> {
    await this.sipRepository.delete(id);
  }

  public async updateValues(): Promise<void> {
    return await this.getAssets().then(async assets => {
      for (const asset of assets) {
        if (asset.apiPath) {
          const newValue = await this.valueFetcher.fetchValue(asset.apiPath);
          const updatedAsset = {
            ...asset,
            marketValue: newValue,
            marketValueUpdatedAt: new Date(),
          };
          await this.assetRepository.update(updatedAsset);
        }
      }
    });
  }

  public async createSIPInvestments(): Promise<void> {
    return this.getAssets().then(async assets => {
      for (const asset of assets) {
        const sip = await this.getSIPByAssetId(asset.id!);
        for (const scheduledInvestment of sip) {
          const pendingInvestments = scheduledInvestment.getPendingOccurences(new Date());
          for (const investment of pendingInvestments) {
            await this.inestmentRepository.create(investment);
          }
        }
      }
    });
  }

  private async toAsset(data: IAsset): Promise<Asset> {
    const investments = await this.getInvestmentByAssetId(data.id!);
    const sips = await this.getSIPByAssetId(data.id!);
    return new Asset({
      ...data,
      investments: investments,
      sips,
    });
  }
}
