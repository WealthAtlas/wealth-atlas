import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetEntity, AssetSchema } from './asset.entity';
import { AssetResolver } from './asset.resolver';
import { AssetService } from './asset.service';
import { InvestmentEntity, InvestmentSchema } from './investment.entity';
import { InvestmentResolver } from './investment.resolver';
import { InvestmentService } from './investment.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AssetEntity.name, schema: AssetSchema }, 
            { name: InvestmentEntity.name, schema: InvestmentSchema }
        ]),
    ],
    providers: [AssetResolver, AssetService, InvestmentResolver, InvestmentService],
    exports: [AssetService, InvestmentService],
})
export class AssetModule { }