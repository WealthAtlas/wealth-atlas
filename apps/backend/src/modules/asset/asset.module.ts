import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetEntity, AssetSchema } from './asset.entity';
import { AssetResolver } from './asset.resolver';
import { AssetService } from './asset.service';
import { AssetValueService } from './value.service';
import { AssetValueResolver } from './value.resolver';
import { AssetValueEntity, AssetValueSchema } from './value.entity';
import { InvestmentModule } from '../investment/investment.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AssetEntity.name, schema: AssetSchema }, 
            { name: AssetValueEntity.name, schema: AssetValueSchema }
        ]),
        forwardRef(() => InvestmentModule),
    ],
    providers: [AssetResolver, AssetService, AssetValueResolver, AssetValueService],
    exports: [AssetService],
})
export class AssetModule { }