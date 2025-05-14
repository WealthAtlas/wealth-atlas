import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ collection: 'expense' })
export class ExpenseEntity extends Document {
    @Prop({ required: true })
    userId!: number;

    @Prop({ required: true })
    description!: string;

    @Prop({ required: true })
    amount!: number;

    @Prop({ required: true })
    currency!: string;

    @Prop({ required: true })
    category!: string;

    @Prop({ required: true })
    tags!: string[];

    @Prop({ required: true })
    date!: Date;
}

export const ExpenseSchema = SchemaFactory.createForClass(ExpenseEntity);
