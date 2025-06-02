import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Context as CustomContext } from '../../context';
import { ExpenseDTO, ExpenseInput } from './expense.graphql';
import { ExpenseService } from './expense.service';

@Resolver(() => ExpenseDTO)
export class ExpenseResolver {
  constructor(private readonly expenseService: ExpenseService) { }

  @Mutation(() => ExpenseDTO)
  async createExpense(
    @Context() context: CustomContext,
    @Args('input') input: ExpenseInput,
  ): Promise<ExpenseDTO> {
    const userId = context.req.user?.userId || '';
    return this.expenseService.createExpense(userId, input);
  }

  @Query(() => [ExpenseDTO])
  async monthlyExpenses(
    @Context() context: CustomContext,
    @Args('month') month: string,
    @Args('year') year: string,
    @Args('categories', { type: () => [String!], nullable: true }) categories?: string[],
    @Args('tags', { type: () => [String!], nullable: true }) tags?: string[],
  ): Promise<ExpenseDTO[]> {
    const userId = context.req.user?.userId || '';
    return this.expenseService.getExpenses(userId, month, year, { categories, tags });
  }
}
