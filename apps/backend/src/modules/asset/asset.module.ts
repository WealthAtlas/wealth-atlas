import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AssetEntity, AssetSchema } from './asset.entity';
import { AssetResolver } from './asset.resolver';
import { AssetService } from './asset.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: AssetEntity.name, schema: AssetSchema }]),
    ],
    providers: [AssetResolver, AssetService],
    exports: [AssetService],
})
export class AssetModule { }