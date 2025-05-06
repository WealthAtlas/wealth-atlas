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

  async addInvestment(id: number, input: InvestmentInput): Promise<InvestmentDTO> {
    throw new Error('Method not implemented.');
  }

  async getInvestments(assetId: number): Promise<InvestmentDTO[]> {
    throw new Error('Method not implemented.');
  }
}