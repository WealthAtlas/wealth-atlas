import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import { AxiosResponse } from 'axios';
import { lastValueFrom } from 'rxjs';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssetEntity } from '../../entities/asset.entity';
import { CreateAssetInput } from './create_asset.input.graphql';

@Injectable()
export class AssetService {
  constructor(
    @InjectModel(AssetEntity.name) private assetModel: Model<AssetEntity>
  ) {
  }

  async createAsset(userId: string, input: CreateAssetInput): Promise<void> {
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

    await asset.save();
  }
}