import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { UserService } from '../../services/user.service';
import { Auth } from '../../models/auth.model';
import { Public } from '../../public.decorator';

@Resolver()
export class UserMutationResolver {
  constructor(private readonly userService: UserService) {}

  @Public()
  @Mutation(() => Boolean)
  async registerUser(
    @Args('name') name: string,
    @Args('email') email: string,
    @Args('password') password: string,
  ): Promise<boolean> {
    return await this.userService.registerUser(name, email, password);
  }

  @Public()
  @Mutation(() => Auth)
  async loginUser(
    @Args('email') email: string,
    @Args('password') password: string,
  ): Promise<Auth> {
    return await this.userService.loginUser(email, password);
  }
}
