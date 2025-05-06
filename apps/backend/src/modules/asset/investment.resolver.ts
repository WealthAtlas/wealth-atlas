import { Args, Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AssetDTO } from './asset.graphql';
import { InvestmentDTO, InvestmentInput } from './investment.graphql';
import { InvestmentService } from './investment.service';

@Resolver(() => AssetDTO)
export class InvestmentResolver {
  constructor(private readonly investmentService: InvestmentService) { }

  @ResolveField(() => Boolean)
  async addInvestment(
    @Parent() asset: AssetDTO,
    @Args('input') input: InvestmentInput
  ): Promise<InvestmentDTO> {
    return this.investmentService.addInvestment(asset.id, input);
  }

  @ResolveField(() => [InvestmentDTO])
  async investments(
    @Parent() asset: AssetDTO,
  ): Promise<InvestmentDTO[]> {
    return this.investmentService.getInvestments(asset.id);
  }
}
