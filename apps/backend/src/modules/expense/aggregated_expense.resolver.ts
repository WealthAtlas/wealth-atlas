import { Args, Context, Parent, Query, ResolveField, Resolver } from '@nestjs/graphql';
import { Context as CustomContext } from '../../context';
import { AggregatedExpenseDTO, ExpenseDTO } from './expense.graphql';
import { ExpenseService } from './expense.service';

@Resolver(() => AggregatedExpenseDTO)
export class AggregatedExpenseResolver {
  constructor(private readonly expenseService: ExpenseService) { }

  @Query(() => [AggregatedExpenseDTO])
  async aggregatedExpenses(
    @Context() context: CustomContext,
    @Args('categories', { type: () => [String!], nullable: true }) categories?: string[],
    @Args('tags', { type: () => [String!], nullable: true }) tags?: string[],
  ): Promise<AggregatedExpenseDTO[]> {
    const userId = context.req.user?.userId || '';
    return this.expenseService.getAggregatedExpenses(userId, { categories, tags });
  }

  @ResolveField(() => [ExpenseDTO])
  async currentValue(
    @Context() context: CustomContext,
    @Parent() aggregatedExpense: AggregatedExpenseDTO,
    @Args('categories', { type: () => [String!], nullable: true }) categories?: string[],
    @Args('tags', { type: () => [String!], nullable: true }) tags?: string[],
  ): Promise<ExpenseDTO[]> {
    const userId = context.req.user?.userId || '';
    return this.expenseService.getExpenses(userId, aggregatedExpense.month, aggregatedExpense.year, { categories, tags });
  }
}