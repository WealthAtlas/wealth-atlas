import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Module({
    imports: [
        JwtModule.register({
            secret: process.env.JWT_SECRET || 'your-secret-key',
            signOptions: { expiresIn: '1h' },
        }),
    ],
    providers: [{
        provide: APP_GUARD,
        useClass: JwtAuthGuard,
    },
        JwtService
    ],
    exports: [JwtService],
})
export class AuthModule { }