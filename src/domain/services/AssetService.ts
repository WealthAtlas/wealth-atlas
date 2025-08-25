import { ValueFetcher } from '../../data/apis/ValueFetcher';
import { AssetRepository } from '../../data/repositories/assets/AssetRepository';
import { AssetTransactionRepository } from '../../data/repositories/assets/AssetTransactionRepository';
import { ScheduledAssetTransactionRepository } from '../../data/repositories/assets/ScheduledAssetTransactionRepository';
import { Asset, IAsset } from '../entities/assets/Asset';
import { AssetTransaction, IAssetTransaction } from '../entities/assets/AssetTransaction';
import {
  IScheduledAssetTransaction,
  ScheduledAssetTransaction,
} from '../entities/assets/ScheduledAssetTransaction';

export class AssetService {
  private readonly assetRepository: AssetRepository;
  private readonly transactionRepository: AssetTransactionRepository;
  private readonly scheduledTransactionRepository: ScheduledAssetTransactionRepository;
  private readonly valueFetcher: ValueFetcher;

  constructor() {
    this.assetRepository = new AssetRepository();
    this.transactionRepository = new AssetTransactionRepository();
    this.scheduledTransactionRepository = new ScheduledAssetTransactionRepository();
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
      .then(() => this.transactionRepository.deleteByAssetId(id))
      .then(() => this.scheduledTransactionRepository.deleteByAssetId(id));
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

  public async addTransaction(transaction: IAssetTransaction): Promise<AssetTransaction> {
    const createdTransaction = await this.transactionRepository.create(transaction);
    return new AssetTransaction({
      ...createdTransaction,
    });
  }

  public async updateTransaction(transaction: IAssetTransaction): Promise<AssetTransaction> {
    const updatedTransaction = await this.transactionRepository.update(transaction);
    return new AssetTransaction({
      ...updatedTransaction,
    });
  }

  public async getTransactionsByAssetId(assetId: number): Promise<AssetTransaction[]> {
    return (await this.transactionRepository.getByAssetId(assetId)).map(transaction => {
      return new AssetTransaction({
        ...transaction,
      });
    });
  }

  public async deleteTransaction(id: number): Promise<void> {
    await this.transactionRepository.delete(id);
  }

  public async addScheduledTransaction(
    transaction: IScheduledAssetTransaction
  ): Promise<ScheduledAssetTransaction> {
    const createdTransaction = await this.scheduledTransactionRepository.create(transaction);
    return new ScheduledAssetTransaction({
      ...createdTransaction,
    });
  }

  public async updateScheduledTransaction(
    transaction: IScheduledAssetTransaction
  ): Promise<ScheduledAssetTransaction> {
    const updatedTransaction = await this.scheduledTransactionRepository.update(transaction);
    return new ScheduledAssetTransaction({
      ...updatedTransaction,
    });
  }

  public async getScheduledTransactionsByAssetId(
    assetId: number
  ): Promise<ScheduledAssetTransaction[]> {
    return (await this.scheduledTransactionRepository.getByAssetId(assetId)).map(transaction => {
      return new ScheduledAssetTransaction({
        ...transaction,
      });
    });
  }

  public async deleteScheduledTransaction(id: number): Promise<void> {
    await this.scheduledTransactionRepository.delete(id);
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

  private async toAsset(data: IAsset): Promise<Asset> {
    const transactions = await this.getTransactionsByAssetId(data.id!);
    const sips = await this.getScheduledTransactionsByAssetId(data.id!);
    return new Asset({
      ...data,
      transactions,
      sips,
    });
  }
}
