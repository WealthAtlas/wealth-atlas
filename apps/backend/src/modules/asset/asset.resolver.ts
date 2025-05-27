import { Args, Context, Float, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Context as CustomContext } from '../../context';
import { AssetService } from './asset.service';
import { AssetDTO, AssetInput } from './asset.graphql';
import { Res } from '@nestjs/common';
import { InvestmentDTO } from '../investment/investment.graphql';

@Resolver(() => AssetDTO)
export class AssetResolver {
  constructor(private readonly assetService: AssetService) { }

  @Mutation(() => AssetDTO)
  async createAsset(
    @Context() context: CustomContext,
    @Args('input') input: AssetInput,
  ): Promise<AssetDTO> {
    const userId = context.req.user?.userId || '';
    return this.assetService.createAsset(userId, input);
  }
  
  @Mutation(() => AssetDTO)
  async updateAsset(
    @Context() context: CustomContext,
    @Args('id') id: string,
    @Args('input') input: AssetInput,
  ): Promise<AssetDTO> {
    const userId = context.req.user?.userId || '';
    return this.assetService.updateAsset(userId, id, input);
  }

  @Query(() => [AssetDTO])
  async assets(@Context() context: CustomContext): Promise<AssetDTO[]> {
    const userId = context.req.user?.userId || '';
    return this.assetService.getAssets(userId);
  }
  
  @Query(() => AssetDTO)
  async asset(
    @Context() context: CustomContext,
    @Args('id') id: string,
  ): Promise<AssetDTO> {
    const userId = context.req.user?.userId || '';
    return this.assetService.getAsset(userId, id);
  }

  @ResolveField(() => Float)
  async currentValue(@Parent() asset: AssetDTO): Promise<number> {
    return this.assetService.computeCurrentValue(asset.id);
  }

  @ResolveField(() => Float)
  async growthRate(@Parent() asset: AssetDTO): Promise<number> {
    return this.assetService.getGrowthRate(asset.id);
  }

  @ResolveField(() => Float)
  async qty(@Parent() asset: AssetDTO): Promise<number> {
    return this.assetService.getQty(asset.id);
  }

  @ResolveField(() => Float)
  async investedAmount(@Parent() asset: AssetDTO): Promise<number> {
    return this.assetService.getInvestedAmount(asset.id);
  }

  @ResolveField(() => [InvestmentDTO])
  async investments(
    @Parent() asset: AssetDTO,
  ): Promise<InvestmentDTO[]> {
    return this.assetService.getInvestments(asset.id);
  }
}
