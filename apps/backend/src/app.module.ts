import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { JwtModule } from '@nestjs/jwt';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AssetEntity, AssetSchema } from './entities/asset.entity';
import { AssetValueEntity, AssetValueSchema } from './entities/asset_value.entity';
import { InvestmentEntity, InvestmentSchema } from './entities/investment.entity';
import { UserEntity, UserSchema } from './entities/user.entity';
import { UserMutationResolver } from './resolvers/user/user.mutation.resolver';
import { UserQueryResolver } from './resolvers/user/user.query.resolver';
import { UserService } from './services/user.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        uri: config.get<string>('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeature([
      { name: UserEntity.name, schema: UserSchema },
      { name: AssetEntity.name, schema: AssetSchema },
      { name: InvestmentEntity.name, schema: InvestmentSchema },
      { name: AssetValueEntity.name, schema: AssetValueSchema },
    ]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      playground: true,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      context: ({ req, res }: { req: Request; res: Response }) => ({ req, res }),
    }),
    JwtModule.register({
      secret: 'your-secret-key',
      signOptions: { expiresIn: '1h' },
    }),
    HttpModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    UserMutationResolver,
    UserQueryResolver,
    UserService,
  ],
})
export class AppModule { }
