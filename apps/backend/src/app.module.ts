import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { join } from 'path';
import { JwtAuthGuard } from './jwt-auth.guard';
import { AssetModule } from './modules/asset/asset.module';
import { ExpenseModule } from './modules/expense/expense.module';
import { GoalModule } from './modules/goal/goal.module';
import { UserModule } from './modules/user/user.module';
import { SIPModule } from './modules/sip/sip.module';
import { InvestmentModule } from './modules/investment/investment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '1h' },
      global: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: true,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
    }),
    HttpModule,
    UserModule,
    AssetModule,
    ExpenseModule,
    GoalModule,
    InvestmentModule,
    SIPModule
  ],
  providers: [{
    provide: APP_GUARD,
    useClass: JwtAuthGuard,
  }],
  controllers: [],
})
export class AppModule { }
