import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FrequencyType = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

@Schema({ collection: 'sips' })
export class SIPEntity extends Document {
  @Prop({ required: true, name: 'asset_id' })
  assetId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  amount!: number;

  @Prop({ required: true })
  frequency!: FrequencyType;

  @Prop({ required: true, name: 'start_date' })
  startDate!: Date;

  @Prop({ required: false, name: 'end_date' })
  endDate?: Date;

  @Prop({ required: false, name: 'last_executed_date' })
  lastExecutedDate?: Date;

  @Prop({ required: false })
  description?: string;
  
  @Prop({ required: true, default: true })
  active!: boolean;
}

export const SIPSchema = SchemaFactory.createForClass(SIPEntity);
