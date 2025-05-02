import { Context, Query, Resolver } from '@nestjs/graphql';
import { Context as CustomContext } from '../../auth/context';
import { UserDTO } from '../../graphql/user.graphql';
import { UserService } from '../../services/user.service';

@Resolver(() => UserDTO)
export class UserQueryResolver {
  constructor(private readonly userService: UserService) { }

  @Query(() => UserDTO)
  async user(@Context() context: CustomContext): Promise<UserDTO> {
    const userId = context.req.user?.userId || '';
    return this.userService.getUser(userId);
  }
}