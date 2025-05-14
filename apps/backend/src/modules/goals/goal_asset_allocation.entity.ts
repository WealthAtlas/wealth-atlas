import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'goal_asset_allocation' })
export class GoalAssetAllocationEntity extends Document {
    @Prop({ required: true, name: 'goal_id' })
    goalId!: string;

    @Prop({ required: true, name: 'asset_id' })
    assetId!: string;

    @Prop({ required: true })
    percentageOfAsset!: number;
}

export const GoalAssetAllocationSchema = SchemaFactory.createForClass(GoalAssetAllocationEntity);