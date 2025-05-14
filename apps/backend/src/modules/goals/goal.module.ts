import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetModule } from '../asset/asset.module';
import { GoalEntity, GoalSchema } from './goal.entity';
import { GoalResolver } from './goal.resolver';
import { GoalService } from './goal.service';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: GoalEntity.name, schema: GoalSchema },
        ]),
        AssetModule,
    ],
    providers: [GoalResolver, GoalService],
    exports: [],
})
export class GoalModule { }