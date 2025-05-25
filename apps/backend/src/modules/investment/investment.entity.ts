import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'investments' })
export class InvestmentEntity extends Document {
  @Prop({ required: true, name: 'asset_id' })
  assetId!: string;

  @Prop({ required: false })
  qty?: number;

  @Prop({ required: true, name: 'value_per_qty' })
  valuePerQty!: number;

  @Prop({ required: true })
  date!: Date;
}

export const InvestmentSchema = SchemaFactory.createForClass(InvestmentEntity);
