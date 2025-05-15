import { Args, Context, Float, Mutation, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Context as CustomContext } from '../../context';
import { AllocatedAssetDTO, GoalDTO, GoalInput } from './goal.graphql';
import { GoalService } from './goal.service';

@Resolver(() => GoalDTO)
export class GoalResolver {
  constructor(private readonly goalService: GoalService) { }

  @Mutation(() => GoalDTO)
  async createGoal(
    @Context() context: CustomContext,
    @Args('input') input: GoalInput,
  ): Promise<GoalDTO> {
    const userId = context.req.user?.userId || '';
    return this.goalService.createGoal(userId, input);
  }

  @Mutation(() => GoalDTO)
  async updateGoal(
    @Context() context: CustomContext,
    @Args('goalId') goalId: number,
    @Args('input') input: GoalInput,
  ): Promise<GoalDTO> {
    const userId = context.req.user?.userId || '';
    return this.goalService.updateGoal(userId, goalId, input);
  }

  @Query(() => [GoalDTO])
  async goals(@Context() context: CustomContext): Promise<GoalDTO[]> {
    const userId = context.req.user?.userId || '';
    return this.goalService.getGoals(userId);
  }

  @ResolveField(() => [AllocatedAssetDTO])
  async allocatedAssets(
    @Context() context: CustomContext,
    @Parent() asset: GoalDTO
  ): Promise<AllocatedAssetDTO[]> {
    const userId = context.req.user?.userId || '';
    return this.goalService.getAllocatedAssets(userId, asset.id);
  }

  @ResolveField(() => AllocatedAssetDTO)
  async allocateAsset(
    @Context() context: CustomContext,
    @Parent() goal: GoalDTO,
    @Args('assetId', { type: () => String }) assetId: string,
    @Args('percentage', { type: () => Float }) percentage: number,
  ): Promise<AllocatedAssetDTO> {
    const userId = context.req.user?.userId || '';
    return this.goalService.allocateAsset(goal.id, userId, assetId, percentage);
  }

  @ResolveField(() => Boolean)
  async removeAsset(
    @Parent() goal: GoalDTO,
    @Args('assetId', { type: () => String }) assetId: string,
  ): Promise<Boolean> {
    return this.goalService.removeAsset(goal.id, assetId);
  }
}