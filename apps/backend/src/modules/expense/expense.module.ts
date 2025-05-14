import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ExpenseEntity, ExpenseSchema } from './expense.entity';
import { ExpenseResolver } from './expense.resolver';
import { ExpenseService } from './expense.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: ExpenseEntity.name, schema: ExpenseSchema },
        ]),
    ],
    providers: [ExpenseResolver, ExpenseService],
    exports: [],
})
export class ExpenseModule { }