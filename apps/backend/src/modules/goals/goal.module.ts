import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetModule } from '../asset/asset.module';
import { GoalEntity, GoalSchema } from './goal.entity';
import { GoalResolver } from './goal.resolver';
import { GoalService } from './goal.service';
import { GoalAssetAllocationEntity, GoalAssetAllocationSchema } from './goal_asset_allocation.entity';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: GoalEntity.name, schema: GoalSchema },
            { name: GoalAssetAllocationEntity.name, schema: GoalAssetAllocationSchema },
        ]),
        AssetModule,
    ],
    providers: [GoalResolver, GoalService],
    exports: [],
})
export class GoalModule { }