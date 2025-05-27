import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetModule } from '../asset/asset.module';
import { InvestmentModule } from '../investment/investment.module';
import { SIPEntity, SIPSchema } from './sip.entity';
import { SIPResolver } from './sip.resolver';
import { SIPService } from './sip.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: SIPEntity.name, schema: SIPSchema },
    ]),
    AssetModule,
    InvestmentModule,
  ],
  providers: [SIPResolver, SIPService],
  exports: [SIPService],
})
export class SIPModule {}
