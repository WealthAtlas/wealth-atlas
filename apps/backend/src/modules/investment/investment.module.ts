import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvestmentEntity, InvestmentSchema } from '../investment/investment.entity';
import { InvestmentResolver } from '../investment/investment.resolver';
import { InvestmentService } from '../investment/investment.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: InvestmentEntity.name, schema: InvestmentSchema },
        ]),
    ],
    providers: [InvestmentResolver, InvestmentService],
    exports: [InvestmentService],
})
export class InvestmentModule { }