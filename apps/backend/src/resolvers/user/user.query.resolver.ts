import { Context, Query, Resolver } from '@nestjs/graphql';
import { User } from '../../models/user.model';
import { UserService } from '../../services/user.service';
import { Context as CustomContext } from '../../auth/context';

@Resolver(() => User)
export class UserQueryResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => User)
  async user(@Context() context: CustomContext): Promise<User> {
    const userId = context.req.user?.userId || '';
    return this.userService.getUser(userId);
  }
}