import { Args, Context, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Context as CustomContext } from '../../context';
import { SIPService } from './sip.service';
import { SIPDTO, SIPInput } from './sip.graphql';
import { AssetDTO } from '../asset/asset.graphql';
import { AssetService } from '../asset/asset.service';

@Resolver(() => SIPDTO)
export class SIPResolver {
  constructor(
    private readonly sipService: SIPService,
    private readonly assetService: AssetService,
  ) {}

  @Mutation(() => SIPDTO)
  async createSIP(
    @Context() context: CustomContext,
    @Args('assetId') assetId: string,
    @Args('input') input: SIPInput,
  ): Promise<SIPDTO> {
    const userId = context.req.user?.userId || '';
    return this.sipService.createSIP(userId, assetId, input);
  }

  @Mutation(() => SIPDTO)
  async updateSIP(
    @Context() context: CustomContext,
    @Args('sipId') sipId: string,
    @Args('input') input: SIPInput,
  ): Promise<SIPDTO> {
    const userId = context.req.user?.userId || '';
    return this.sipService.updateSIP(userId, sipId, input);
  }

  @Mutation(() => Boolean)
  async deleteSIP(
    @Context() context: CustomContext,
    @Args('sipId') sipId: string,
  ): Promise<boolean> {
    const userId = context.req.user?.userId || '';
    return this.sipService.deleteSIP(userId, sipId);
  }

  @ResolveField(() => AssetDTO)
  async asset(
    @Context() context: CustomContext,
    @Parent() sip: SIPDTO,
  ): Promise<AssetDTO> {
    const userId = context.req.user?.userId || '';
    return this.assetService.getAsset(userId, sip.assetId);
  }
}
