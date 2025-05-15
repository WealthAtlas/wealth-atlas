import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'goals' })
export class GoalEntity extends Document {
    @Prop({ required: true })
    userId!: string;

    @Prop({ required: true })
    name!: string;

    @Prop({ required: true })
    targetAmount!: number;

    @Prop({ required: true })
    inflationRate!: number;

    @Prop({ required: true })
    targetDate!: Date;
}

export const GoalSchema = SchemaFactory.createForClass(GoalEntity);
