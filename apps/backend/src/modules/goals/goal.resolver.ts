import { Args, Context, Float, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Context as CustomContext } from '../../context';
import { AssetDTO } from '../asset/asset.graphql';
import { AllocatedAssetDTO, GoalDTO, GoalInput } from './goal.graphql';
import { GoalService } from './goal.service';

@Resolver(() => GoalDTO)
export class GoalResolver {
  constructor(private readonly goalService: GoalService) { }

  @Mutation(() => Boolean)
  async createGoal(
    @Context() context: CustomContext,
    @Args('input') input: GoalInput,
  ): Promise<GoalDTO> {
    const userId = context.req.user?.userId || '';
    return this.goalService.createGoal(userId, input);
  }

  @Query(() => [GoalDTO])
  async goals(@Context() context: CustomContext): Promise<GoalDTO[]> {
    const userId = context.req.user?.userId || '';
    return this.goalService.getGoals(userId);
  }

  @ResolveField(() => [AllocatedAssetDTO])
  async allocatedAssets(@Parent() asset: AssetDTO): Promise<AllocatedAssetDTO[]> {
    return this.goalService.getAllocatedAssets(asset.id);
  }
}