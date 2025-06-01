import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AssetService } from '../asset/asset.service';
import { SIPEntity } from './sip.entity';
import { SIPDTO, SIPInput } from './sip.graphql';
import { InvestmentInput } from '../investment/investment.graphql';
import { InvestmentService } from '../investment/investment.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SIPService {
  constructor(
    @InjectModel(SIPEntity.name) private sipModel: Model<SIPEntity>,
    private assetService: AssetService,
    private investmentService: InvestmentService,
  ) {}

  async createSIP(userId: string, assetId: string, input: SIPInput): Promise<SIPDTO> {
    // Validate that the asset exists and belongs to the user
    const asset = await this.assetService.getAsset(userId, assetId);
    if (!asset) {
      throw new Error('Asset not found');
    }

    const sip = new this.sipModel({
      assetId,
      ...input,
    });

    const savedSIP = await sip.save();
    return SIPDTO.fromData(savedSIP.toObject());
  }

  async updateSIP(userId: string, sipId: string, input: SIPInput): Promise<SIPDTO> {
    const sip = await this.sipModel.findOne({ _id: sipId }).exec();
    if (!sip) {
      throw new Error('SIP not found');
    }

    const asset = await this.assetService.getAsset(userId, sip.assetId);
    if (!asset) {
      throw new Error('User does not own the asset for this SIP');
    }

    // Update the SIP
    const updatedSIP = await this.sipModel.findByIdAndUpdate(
      sipId,
      input,
      { new: true },
    ).exec();

    if (!updatedSIP) {
      throw new Error('Failed to update SIP');
    }

    return SIPDTO.fromData(updatedSIP.toObject());
  }

  async deleteSIP(userId: string, sipId: string): Promise<boolean> {
    // Find SIP
    const sip = await this.sipModel.findOne({ _id: sipId }).exec();
    if (!sip) {
      throw new Error('SIP not found');
    }

    const asset = await this.assetService.getAsset(userId, sip.assetId);
    if (!asset) {
      throw new Error('User does not own the asset for this SIP');
    }

    const result = await this.sipModel.deleteOne({ _id: sipId }).exec();
    return result.deletedCount > 0;
  }

  async getSIPsByAsset(assetId: string): Promise<SIPDTO[]> {
    const sips = await this.sipModel.find({ assetId }).exec();
    return sips.map(sip => SIPDTO.fromData(sip.toObject()));
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async executePendingSIPs(): Promise<void> {
    const now = new Date();
    const sips = await this.sipModel.find({
      startDate: { $lte: now },
      $or: [
        { endDate: { $exists: false } },
        { endDate: { $gte: now } }
      ]
    }).exec();

    for (const sip of sips) {
      try {
        const lastExecutedDate = sip.lastExecutedDate || sip.startDate;
        const shouldExecute = this.shouldExecuteSIP(sip.frequency, lastExecutedDate, now);
        
        if (shouldExecute) {
          await this.executeSIP(sip._id);
        }
      } catch (error) {
        console.error(`Failed to execute SIP ${sip._id}:`, error);
      }
    }
  }
  
  private shouldExecuteSIP(frequency: string, lastExecutedDate: Date, currentDate: Date): boolean {
    if (!lastExecutedDate) return true;
    
    const daysSinceLastExecution = Math.floor(
      (currentDate.getTime() - lastExecutedDate.getTime()) / (24 * 60 * 60 * 1000)
    );
    
    switch (frequency) {
      case 'daily':
        return daysSinceLastExecution >= 1;
      case 'weekly':
        return daysSinceLastExecution >= 7;
      case 'monthly':
        // Check if we're in a new month compared to last execution
        return (
          currentDate.getMonth() !== lastExecutedDate.getMonth() ||
          currentDate.getFullYear() !== lastExecutedDate.getFullYear()
        );
      case 'quarterly':
        // Check if at least 3 months have passed
        const monthsDiff = 
          (currentDate.getFullYear() - lastExecutedDate.getFullYear()) * 12 + 
          (currentDate.getMonth() - lastExecutedDate.getMonth());
        return monthsDiff >= 3;
      case 'yearly':
        return currentDate.getFullYear() > lastExecutedDate.getFullYear();
      default:
        return false;
    }
  }
  
  async executeSIP(sipId: string): Promise<boolean> {
    const sip = await this.sipModel.findOne({ _id: sipId }).exec();
    if (!sip) {
      throw new Error('SIP not found');
    }
    
    // Create a new investment for this SIP execution
    const investmentInput: InvestmentInput = {
      valuePerQty: 1, // This might need to be calculated based on asset's current value
      qty: sip.amount,
      date: new Date()
    };
    
    await this.investmentService.addInvestmentBySystem(sip.assetId, investmentInput);
    
    // Update the lastExecutedDate of the SIP
    sip.lastExecutedDate = new Date();
    await sip.save();
    
    return true;
  }
}
