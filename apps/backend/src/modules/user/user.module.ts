import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserEntity, UserSchema } from './user.entity';
import { UserService } from './user.service';
import { UserResolver } from './user.resolver';
import { AuthModule } from '../auth/auth.module';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: UserEntity.name, schema: UserSchema }]),
        forwardRef(() => AuthModule),
    ],
    providers: [UserResolver, UserService],
    exports: [UserService],
})
export class UserModule { }