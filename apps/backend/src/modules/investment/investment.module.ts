import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvestmentEntity, InvestmentSchema } from '../investment/investment.entity';
import { InvestmentResolver } from '../investment/investment.resolver';
import { InvestmentService } from '../investment/investment.service';
import { AssetModule } from '../asset/asset.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: InvestmentEntity.name, schema: InvestmentSchema },
        ]),
        forwardRef(() => AssetModule),
    ],
    providers: [InvestmentResolver, InvestmentService],
    exports: [InvestmentService],
})
export class InvestmentModule { }