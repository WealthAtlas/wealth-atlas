import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { InvestmentDTO } from '../investment/investment.graphql';
import { InvestmentService } from '../investment/investment.service';
import { AssetEntity } from './asset.entity';

@Injectable()
export class ValueService {

  constructor(
    @InjectModel(AssetEntity.name) private assetModel: Model<AssetEntity>,
    @Inject(forwardRef(() => InvestmentService)) private investmentService: InvestmentService,
  ) {
  }


  async getCurrentValue(assetId: string, currentDate: Date = new Date()): Promise<number> {
    const asset = await this.assetModel.findById(assetId).exec();
    if (!asset) {
      throw new Error('Asset not found');
    }

    switch (asset.valueStrategy.type) {
      case 'fixed': {
        const investments = await this.investmentService.getInvestments(assetId);
        const growthRate = asset.valueStrategy.growthRate;
        let total = 0;
        for (const inv of investments) {
          const principal = (inv.qty ?? 1) * inv.valuePerQty;
          const investDate = new Date(inv.date);
          const years = (currentDate.getTime() - investDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
          const futureValue = principal * Math.pow(1 + growthRate / 100, years);
          total += futureValue;
        }
        return total;
      }
      case 'dynamic': {
        const investments = await this.investmentService.getInvestments(assetId);
        const totalQty = investments.reduce((sum, inv) => sum + (inv.qty ?? 1), 0);
        
        // If we're in a Node.js environment, we'll need to pass this to the frontend
        // since we can't safely execute arbitrary JavaScript in the backend
        if (!asset.valueStrategy.scriptCode) {
          throw new Error('Dynamic asset is missing script code');
        }

        // We'll just store the last known value here for reference
        // The frontend will be responsible for executing the script code
        return asset.latestValue || 0;
      }
      case 'manual':
        return asset.latestValue || 0;
    }
  }

  async getGrowthRate(assetId: string): Promise<number> {
    const asset = await this.assetModel.findById(assetId).exec();
    if (!asset) {
      throw new Error('Asset not found');
    }

    const investments = await this.investmentService.getInvestments(assetId);

    let totalInvestment = 0;
    let totalQuantity = 0;

    if(!investments || investments.length === 0) {
      return 0;
    }

    investments.forEach((investment: any) => {
      totalInvestment += (investment.qty ?? 1) * investment.valuePerQty;
      totalQuantity += investment.qty ?? 1;
    });

    const latestValue = await this.getCurrentValue(assetId);

    const currentValue = latestValue * totalQuantity;

    const firstInvestmentDate = new Date(investments[0].date);
    const latestValueDate = new Date();
    const timePeriod = (latestValueDate.getTime() - firstInvestmentDate.getTime()) / (1000 * 60 * 60 * 24 * 365);

    const cagr = ((currentValue / totalInvestment) ** (1 / timePeriod)) - 1;

    return cagr * 100;
  }

  async _getInvestments(assetId: string): Promise<InvestmentDTO[]> {
    return this.investmentService.getInvestments(assetId);
  }

  // This is a placeholder method - in this architecture,
  // the actual script execution will happen on the frontend
  // to avoid security issues with executing arbitrary code on the server
  private async _executeDynamicScript(scriptCode: string): Promise<number> {
    // In a real implementation, we might have a secure sandbox environment
    // or pass this to the frontend for execution
    console.warn('Dynamic script execution attempted on server side - this is not implemented for security reasons');
    return 0;
  }
}