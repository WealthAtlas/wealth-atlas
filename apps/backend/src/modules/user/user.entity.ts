import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

@Schema({ collection: 'user' })
export class UserEntity extends Document {
    @Prop({ default: uuidv4, unique: true })
    userId!: string;

    @Prop({ required: true, unique: false })
    name!: string;

    @Prop({ required: true, unique: true })
    email!: string;

    @Prop({ required: true, unique: false, name: 'password_hash' })
    passwordHash!: string;
}

export const UserSchema = SchemaFactory.createForClass(UserEntity);