import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'assets' })
export class AssetEntity extends Document {
  @Prop({ required: true })
  userId!: string;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  description!: string;

  @Prop({ required: true })
  category!: string;

  @Prop({ required: false, name: 'maturity_date' })
  maturityDate?: Date;

  @Prop({ required: true })
  currency!: string;

  @Prop({ required: true, name: 'risk_level' })
  riskLevel!: string;

  @Prop({ required: false, name: 'growth_rate' })
  growthRate?: number;
}

export const AssetSchema = SchemaFactory.createForClass(AssetEntity);
