import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { InvestmentDTO, InvestmentInput } from './investment.graphql';
import { InvestmentService } from './investment.service';
import { Context as CustomContext } from '../../context';

@Resolver(() => InvestmentDTO)
export class InvestmentResolver {
  constructor(private readonly investmentService: InvestmentService) { }

  @Mutation(() => InvestmentDTO)
  async addInvestment(
    @Context() context: CustomContext,
    @Args('assetId') assetId: string,
    @Args('input') input: InvestmentInput
  ): Promise<InvestmentDTO> {
    const userId = context.req.user?.userId || '';
    return this.investmentService.addInvestment(userId, assetId, input);
  }

  @Mutation(() => [InvestmentDTO])
  async updateInvestment(
    @Context() context: CustomContext,
    @Args('assetId') assetId: string,
    @Args('investmentId') investmentId: string,
    @Args('input') input: InvestmentInput
  ): Promise<InvestmentDTO> {
    const userId = context.req.user?.userId || '';
    return this.investmentService.updateInvestment(userId, assetId, investmentId, input);
  }

  @Mutation(() => Boolean)
  async deleteInvestment(
    @Context() context: CustomContext,
    @Args('assetId') assetId: string,
    @Args('investmentId') investmentID: string,
  ): Promise<boolean> {
    const userId = context.req.user?.userId || '';
    return this.investmentService.deleteInvestment(userId, assetId, investmentID);
  }
}
