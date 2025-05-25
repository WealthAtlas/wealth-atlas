import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssetEntity } from './asset.entity';
import { AssetDTO, AssetInput } from './asset.graphql';
import { InvestmentEntity } from '../investment/investment.entity';
import { AssetValueEntity } from './value.entity';
import { InvestmentService } from '../investment/investment.service';
import { InvestmentDTO } from '../investment/investment.graphql';

@Injectable()
export class AssetService {

  constructor(
    @InjectModel(AssetEntity.name) private assetModel: Model<AssetEntity>,
    @InjectModel(AssetValueEntity.name) private assetValueModel: Model<AssetValueEntity>,
    private investmentService: InvestmentService
  ) {
  }

  async createAsset(userId: string, input: AssetInput): Promise<AssetDTO> {
    const asset = new this.assetModel({
      userId: userId,
      name: input.name,
      description: input.description,
      category: input.category,
      maturityDate: input.maturityDate,
      currency: input.currency,
      riskLevel: input.riskLevel,
      growthRate: input.growthRate,
    });

    return asset.save().then((savedAsset) => {
      return {
        id: savedAsset._id,
        name: savedAsset.name,
        description: savedAsset.description,
        category: savedAsset.category,
        maturityDate: savedAsset.maturityDate,
        currency: savedAsset.currency,
        riskLevel: savedAsset.riskLevel,
        growthRate: savedAsset.growthRate,
      };
    });
  }


  async getAssets(userId: string): Promise<AssetDTO[]> {
    return this.assetModel.find({ userId }).exec().then((assets) => {
      return assets.map((asset) => {
        return {
          id: asset._id,
          name: asset.name,
          description: asset.description,
          category: asset.category,
          maturityDate: asset.maturityDate,
          currency: asset.currency,
          riskLevel: asset.riskLevel,
          growthRate: asset.growthRate,
        };
      });
    });
  }

  async getAsset(userId: string, assetId: string): Promise<AssetDTO> {
    return this.assetModel.findOne({ userId, _id: assetId }).exec().then((asset) => {
      if (!asset) {
        throw new Error('Asset not found');
      }
      return {
        id: asset._id,
        name: asset.name,
        description: asset.description,
        category: asset.category,
        maturityDate: asset.maturityDate,
        currency: asset.currency,
        riskLevel: asset.riskLevel,
        growthRate: asset.growthRate,
      };
    });
  }

  async computeCurrentValue(assetId: string): Promise<number> {
    const asset = await this.assetModel.findById(assetId).exec();
    if (!asset) {
      throw new Error('Asset not found');
    }
    const values = await this.assetValueModel.find({ assetId }).exec();
    if (!values.length) {
      throw new Error('No values found for this asset');
    }
    const latestValue = values.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].valuePerQty;
    return latestValue;
  }

  async getGrowthRate(assetId: string): Promise<number> {
    const asset = await this.assetModel.findById(assetId).exec();
    if (!asset) {
      throw new Error('Asset not found');
    }

    const values = await this.assetValueModel.find({ assetId }).exec();
    const investments = await this.investmentService.getInvestments(assetId);

    if (!values.length || !investments.length) {
      return 0;
    }

    let totalInvestment = 0;
    let totalQuantity = 0;

    investments.forEach((investment: any) => {
      totalInvestment += (investment.qty ?? 1) * investment.valuePerQty;
      totalQuantity += investment.qty ?? 1;
    });

    const latestValue = values.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0].valuePerQty;

    const currentValue = latestValue * totalQuantity;

    const firstInvestmentDate = new Date(investments[0].date);
    const latestValueDate = new Date(values[0].date);
    const timePeriod = (latestValueDate.getTime() - firstInvestmentDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    const cagr = ((currentValue / totalInvestment) ** (1 / timePeriod)) - 1;

    return cagr * 100;
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

  getInvestedAmount(id: string): number | PromiseLike<number> {
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