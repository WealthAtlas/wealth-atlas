import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssetValueEntity } from './value.entity';
import { AssetValueDTO, AssetValueInput } from './value.graphql';

@Injectable()
export class AssetValueService {

  constructor(
    @InjectModel(AssetValueEntity.name) private valueModel: Model<AssetValueEntity>
  ) {
  }

  async addValue(assetId: string, input: AssetValueInput): Promise<AssetValueDTO> {
    const value = new this.valueModel({
      assetId,
      ...input
    });
    return value.save();
  }

  async getValues(assetId: string): Promise<AssetValueDTO[]> {
    const values = await this.valueModel.find({ assetId }).exec();
    return values.map(value => ({
      valuePerQty: value.valuePerQty,
      date: value.date
    }));
  }
}