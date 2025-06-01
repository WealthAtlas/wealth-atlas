import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssetService } from '../asset/asset.service';
import { InvestmentEntity } from './investment.entity';
import { InvestmentDTO, InvestmentInput } from './investment.graphql';

@Injectable()
export class InvestmentService {


  constructor(
    @InjectModel(InvestmentEntity.name) private investmentModel: Model<InvestmentEntity>,
    @Inject(forwardRef(() => AssetService)) private assetService: AssetService,
  ) {
  }

  async addInvestment(userId: string, assetId: string, input: InvestmentInput): Promise<InvestmentDTO> {
    return this.assetService.getAsset(userId, assetId).then(asset => {
      if (!asset) {
        throw new Error('Asset not found');
      }

      const investment = new this.investmentModel({
        assetId,
        ...input
      });
      return investment.save().then((savedInvestment) => {
        return InvestmentDTO.fromData(savedInvestment.toObject());
      });
    });
  }

   async addInvestmentBySystem(assetId: string, input: InvestmentInput): Promise<InvestmentDTO> {
    const investment = new this.investmentModel({
        assetId,
        ...input
      });
      return investment.save().then((savedInvestment) => {
        return InvestmentDTO.fromData(savedInvestment.toObject());
      });
  }

  async updateInvestment(
    userId: string,
    investmentId: string,
    input: InvestmentInput
  ): Promise<InvestmentDTO> {
    const investment = await this.investmentModel.findById(investmentId).exec();
    
    if (!investment) {
      throw new Error('Investment not found');
    }
    const assetId = investment.assetId;
    const asset = await this.assetService.getAsset(userId, assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }
    const updatedInvestment = await this.investmentModel.findOneAndUpdate(
      { _id: investmentId, assetId },
      input,
      { new: true }
    );
    if (!updatedInvestment) {
      throw new Error('Investment not found');
    }
    return InvestmentDTO.fromData(updatedInvestment.toObject())
  }

  async deleteInvestment(userId: string, investmentId: string): Promise<boolean> {

    const investment = await this.investmentModel.findById(investmentId).exec();
    if (!investment) {
      throw new Error('Investment not found');
    }
    const assetId = investment.assetId;
    const asset = await this.assetService.getAsset(userId, assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }
    const result = await this.investmentModel.deleteOne({ _id: investmentId, assetId });
    return result.deletedCount > 0;
  }

  async getInvestments(assetId: string): Promise<InvestmentDTO[]> {
    const investments = await this.investmentModel.find({ assetId }).exec();
    return investments.map(investment => InvestmentDTO.fromData(investment.toObject()));
  }
}