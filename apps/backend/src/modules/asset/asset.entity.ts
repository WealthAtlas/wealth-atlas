import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ValueStrategy =
  | { type: 'fixed'; growthRate: number }
  | { type: 'dynamic'; apiSource: string; value?: number, updatetAt?: Date }
  | { type: 'manual'; value: number; updatedAt: Date };

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

  @Prop({ required: true, type: Object })
  valueStrategy!: ValueStrategy;

  @Prop({ required: false, name: 'latest_value' })
  latestValue?: number;

  @Prop({ required: false, name: 'latest_value_date' })
  latestValueDate?: Date;
}

export const AssetSchema = SchemaFactory.createForClass(AssetEntity);
