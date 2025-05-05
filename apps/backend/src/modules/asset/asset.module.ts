import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetEntity, AssetSchema } from '../../entities/asset.entity';
import { AssetMutationResolver } from './asset.mutation.resolver';
import { AssetService } from './asset.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: AssetEntity.name, schema: AssetSchema }]),
    ],
    providers: [AssetMutationResolver, AssetService],
    exports: [AssetService],
})
export class AssetModule { }