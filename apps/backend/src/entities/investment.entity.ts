import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'investment' })
export class InvestmentEntity extends Document {
  @Prop({ required: true, name: 'asset_id' })
  assetId!: number;

  @Prop({ required: false })
  qty?: number;

  @Prop({ required: true, name: 'value_per_qty' })
  valuePerQty!: number;

  @Prop({ required: true })
  currency!: string;

  @Prop({ required: true })
  date!: Date;
}

export const InvestmentSchema = SchemaFactory.createForClass(InvestmentEntity);
