import { Args, Float, Parent, ResolveField, Resolver } from '@nestjs/graphql';
import { AssetDTO } from '../asset/asset.graphql';
import { InvestmentDTO, InvestmentInput } from './investment.graphql';
import { InvestmentService } from './investment.service';

@Resolver(() => AssetDTO)
export class InvestmentResolver {
  constructor(private readonly investmentService: InvestmentService) { }

  @ResolveField(() => InvestmentDTO)
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

  @ResolveField(() => [InvestmentDTO])
  async updateInvestment(
    @Parent() asset: AssetDTO,
    @Args('id') id: string,
    @Args('input') input: InvestmentInput
  ): Promise<InvestmentDTO> {
    return this.investmentService.updateInvestment(asset.id, id, input);
  }

  @ResolveField(() => Boolean)
  async deleteInvestment(
    @Parent() asset: AssetDTO,
    @Args('id') id: string
  ): Promise<boolean> {
    return this.investmentService.deleteInvestment(asset.id, id);
  }
}
