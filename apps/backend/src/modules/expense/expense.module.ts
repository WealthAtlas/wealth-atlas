import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExpenseEntity, ExpenseSchema } from './expense.entity';
import { ExpenseResolver } from './expense.resolver';
import { ExpenseService } from './expense.service';
import { AggregatedExpenseResolver } from './aggregated_expense.resolver';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ExpenseEntity.name, schema: ExpenseSchema },
        ]),
    ],
    providers: [ExpenseResolver, AggregatedExpenseResolver, ExpenseService],
    exports: [],
})
export class ExpenseModule { }