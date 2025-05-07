import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetEntity, AssetSchema } from './asset.entity';
import { AssetResolver } from './asset.resolver';
import { AssetService } from './asset.service';
import { InvestmentEntity, InvestmentSchema } from './investment.entity';
import { InvestmentResolver } from './investment.resolver';
import { InvestmentService } from './investment.service';
import { AssetValueService } from './value.service';
import { AssetValueResolver } from './value.resolver';
import { AssetValueEntity, AssetValueSchema } from './value.entity';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AssetEntity.name, schema: AssetSchema }, 
            { name: InvestmentEntity.name, schema: InvestmentSchema },
            { name: AssetValueEntity.name, schema: AssetValueSchema }
        ]),
    ],
    providers: [AssetResolver, AssetService, InvestmentResolver, InvestmentService, AssetValueResolver, AssetValueService],
    exports: [],
})
export class AssetModule { }