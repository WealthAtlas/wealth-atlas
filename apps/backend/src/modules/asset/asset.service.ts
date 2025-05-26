import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InvestmentDTO } from '../investment/investment.graphql';
import { InvestmentService } from '../investment/investment.service';
import { AssetEntity } from './asset.entity';
import { AssetDTO, AssetInput } from './asset.graphql';
import { ValueService } from './value.service';

@Injectable()
export class AssetService {

  constructor(
    @InjectModel(AssetEntity.name) private assetModel: Model<AssetEntity>,
    @Inject(forwardRef(() => InvestmentService)) private investmentService: InvestmentService,
    private valueService: ValueService
  ) {
  }

  async createAsset(userId: string, input: AssetInput): Promise<AssetDTO> {
    // Determine the value strategy based on input
    let valueStrategy;

    if (input.fixedValueStrategy) {
      valueStrategy = {
        type: 'fixed',
        growthRate: input.fixedValueStrategy.growthRate
      };
    } else if (input.dynamicValueStrategy) {
      valueStrategy = {
        type: 'dynamic',
        apiSource: input.dynamicValueStrategy.apiSource,
        value: input.dynamicValueStrategy.value,
        updatedAt: new Date()
      };
    } else if (input.manualValueStrategy) {
      valueStrategy = {
        type: 'manual',
        value: input.manualValueStrategy.value,
        updatedAt: new Date()
      };
    }

    const asset = new this.assetModel({
      userId: userId,
      name: input.name,
      description: input.description,
      category: input.category,
      maturityDate: input.maturityDate,
      currency: input.currency,
      riskLevel: input.riskLevel,
      valueStrategy: valueStrategy,
    });

    return asset.save().then((savedAsset) => {
      return AssetDTO.fromData(savedAsset.toObject());
    });
  }


  async getAssets(userId: string): Promise<AssetDTO[]> {
    return this.assetModel.find({ userId }).exec().then((assets) => {
      return assets.map((asset) => AssetDTO.fromData(asset.toObject()));
    });
  }

  async getAsset(userId: string, assetId: string): Promise<AssetDTO> {
    return this.assetModel.findOne({ userId, _id: assetId }).exec().then((asset) => {
      if (!asset) {
        throw new Error('Asset not found');
      }
      return AssetDTO.fromData(asset.toObject());
    });
  }

  async computeCurrentValue(assetId: string): Promise<number> {
    return this.valueService.getCurrentValue(assetId);
  }

  async getGrowthRate(assetId: string): Promise<number> {
    return this.valueService.getGrowthRate(assetId);
  }

  async getQty(assetID: string): Promise<number> {
    const investments = await this.investmentService.getInvestments(assetID);
    return investments.reduce((total: number, investment: any) => {
      return total + (investment.qty ?? 1);
    }, 0);
  }

  async deleteAsset(assetId: string): Promise<boolean> {
    const result = await this.assetModel.deleteOne({ _id: assetId }).exec();
    return result.deletedCount > 0;
  }

  async getInvestedAmount(id: string): Promise<number> {
    return this.investmentService.getInvestments(id).then((investments: any[]) => {
      if (!investments || investments.length === 0) {
        return 0;
      }
      return investments.reduce((total: number, investment: InvestmentDTO) => {
        return total + (investment.amount);
      }, 0);
    });
  }
}