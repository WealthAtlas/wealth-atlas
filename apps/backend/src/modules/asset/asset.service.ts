import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssetEntity } from './asset.entity';
import { AssetDTO, AssetInput } from './asset.graphql';
import { InvestmentDTO } from './investment.graphql';

@Injectable()
export class AssetService {

  constructor(
    @InjectModel(AssetEntity.name) private assetModel: Model<AssetEntity>
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

  async computeCurrentValue(id: number): Promise<number> {
    throw new Error('Method not implemented.');
  }

  async addInvestment(id: number, input: InvestmentDTO): Promise<InvestmentDTO> {
    throw new Error('Method not implemented.');
  }
}