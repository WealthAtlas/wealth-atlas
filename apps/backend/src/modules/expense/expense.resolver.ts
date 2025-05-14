import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { Context as CustomContext } from '../../context';
import { ExpenseDTO, ExpenseInput } from './expense.graphql';
import { ExpenseService } from './expense.service';

@Resolver(() => ExpenseDTO)
export class ExpenseResolver {
  constructor(private readonly expenseService: ExpenseService) { }

  @Mutation(() => Boolean)
  async createExpense(
    @Context() context: CustomContext,
    @Args('input') input: ExpenseInput,
  ): Promise<ExpenseDTO> {
    const userId = context.req.user?.userId || '';
    return this.expenseService.createExpense(userId, input);
  }
}
