import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvestmentModule } from '../investment/investment.module';
import { AssetEntity, AssetSchema } from './asset.entity';
import { AssetResolver } from './asset.resolver';
import { AssetService } from './asset.service';
import { ValueService } from './value.service';
import { ScriptExecutorService } from './script-executor.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: AssetEntity.name, schema: AssetSchema },
        ]),
        forwardRef(() => InvestmentModule),
    ],
    providers: [AssetResolver, AssetService, ValueService, ScriptExecutorService],
    exports: [AssetService],
})
export class AssetModule { }