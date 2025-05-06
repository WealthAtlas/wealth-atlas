import { Args, Context, Float, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Context as CustomContext } from '../../context';
import { AssetService } from './asset.service';
import { AssetDTO, AssetInput } from './asset.graphql';
import { InvestmentDTO } from './investment.graphql';

@Resolver(() => AssetDTO)
export class AssetResolver {
  constructor(private readonly assetService: AssetService) { }

  @Mutation(() => Boolean)
  async createAsset(
    @Context() context: CustomContext,
    @Args('input') input: AssetInput,
  ): Promise<boolean> {
    const userId = context.req.user?.userId || '';
    return this.assetService.createAsset(userId, input).then(() => true);
  }

  @Query(() => [AssetDTO])
  async getAssets(@Context() context: CustomContext): Promise<AssetDTO[]> {
    const userId = context.req.user?.userId || '';
    return this.assetService.getAssets(userId);
  }

  @ResolveField(() => Float, { nullable: true })
  async currentValue(@Parent() asset: AssetDTO): Promise<number | null> {
    return this.assetService.computeCurrentValue(asset.id);
  }

  @ResolveField(() => Boolean, { nullable: true })
  async addInvestment(
    @Parent() asset: AssetDTO,
    @Args('input') input: InvestmentDTO
  ): Promise<InvestmentDTO> {
    return this.assetService.addInvestment(asset.id, input);
  }
}
