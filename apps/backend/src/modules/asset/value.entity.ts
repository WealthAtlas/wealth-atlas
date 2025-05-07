import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'asset_value' })
export class AssetValueEntity extends Document {
  @Prop({ required: true, name: 'asset_id' })
  assetId!: number;

  @Prop({ required: true, name: 'value_per_qty' })
  valuePerQty!: number;

  @Prop({ required: true })
  date!: Date;
}

export const AssetValueSchema = SchemaFactory.createForClass(AssetValueEntity);
