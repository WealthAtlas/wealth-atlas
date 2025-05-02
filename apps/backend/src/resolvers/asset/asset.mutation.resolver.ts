import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { Context as CustomContext } from '../../auth/context';
import { CreateAssetInput } from '../../graphql/create_asset.input.graphql';
import { AssetService } from '../../services/asset.service';

@Resolver()
export class AssetMutationResolver {
  constructor(private readonly assetService: AssetService) { }

  @Mutation(() => Boolean)
  async createAsset(
    @Context() context: CustomContext,
    @Args('input') createAssetInput: CreateAssetInput,
  ): Promise<boolean> {
    const userId = context.req.user?.userId || '';
    return this.assetService.createAsset(userId, createAssetInput).then(() => true);
  }
}
