import { Args, Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AssetDTO } from './asset.graphql';
import { AssetValueDTO, AssetValueInput } from './value.graphql';
import { AssetValueService } from './value.service';

@Resolver(() => AssetDTO)
export class AssetValueResolver {
  constructor(private readonly valueService: AssetValueService) { }

  @ResolveField(() => Boolean)
  async addValue(
    @Parent() asset: AssetDTO,
    @Args('input') input: AssetValueInput
  ): Promise<AssetValueDTO> {
    return this.valueService.addValue(asset.id, input);
  }

  @ResolveField(() => [AssetValueDTO])
  async values(
    @Parent() asset: AssetDTO,
  ): Promise<AssetValueDTO[]> {
    return this.valueService.getValues(asset.id);
  }
}
