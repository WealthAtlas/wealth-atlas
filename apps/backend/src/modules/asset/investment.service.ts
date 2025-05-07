import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InvestmentEntity } from './investment.entity';
import { InvestmentDTO, InvestmentInput } from './investment.graphql';

@Injectable()
export class InvestmentService {


  constructor(
    @InjectModel(InvestmentEntity.name) private investmentModel: Model<InvestmentEntity>
  ) {
  }

  async addInvestment(assetId: number, input: InvestmentInput): Promise<InvestmentDTO> {
    const investment = new this.investmentModel({
      assetId,
      ...input
    });
    return investment.save();
  }

  async getInvestments(assetId: number): Promise<InvestmentDTO[]> {
    const investments = await this.investmentModel.find({ assetId }).exec();
    return investments.map(investment => ({
      qty: investment.qty,
      valuePerQty: investment.valuePerQty,
      date: investment.date
    }));
  }
}