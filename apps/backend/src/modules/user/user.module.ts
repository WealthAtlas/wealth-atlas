import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { UserEntity, UserSchema } from '../../entities/user.entity';
import { UserMutationResolver } from './user.mutation.resolver';
import { UserQueryResolver } from './user.query.resolver';
import { UserService } from './user.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { APP_GUARD } from '@nestjs/core';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: UserEntity.name, schema: UserSchema }]),
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'your-secret-key',
            signOptions: { expiresIn: '1h' },
        }),
    ],
    providers: [UserMutationResolver, UserQueryResolver, UserService, {
        provide: APP_GUARD,
        useClass: JwtAuthGuard,
    }],
    exports: [UserService],
})
export class UserModule { }