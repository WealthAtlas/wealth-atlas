import { Args, Mutation, Resolver } from '@nestjs/graphql';
import { AuthDTO } from '../../graphql/auth.graphql';
import { Public } from '../../public.decorator';
import { UserService } from '../../services/user.service';

@Resolver()
export class UserMutationResolver {
  constructor(private readonly userService: UserService) { }

  @Public()
  @Mutation(() => Boolean)
  async registerUser(
    @Args('name') name: string,
    @Args('email') email: string,
    @Args('password') password: string,
  ): Promise<boolean> {
    return await this.userService.registerUser(name, email, password).then(() => {
      return true;
    }).catch((error) => {
      console.error('Error saving user:', error);
      throw new Error('Failed to save user');
    }
    );
  }

  @Public()
  @Mutation(() => AuthDTO)
  async loginUser(
    @Args('email') email: string,
    @Args('password') password: string,
  ): Promise<AuthDTO> {
    return await this.userService.loginUser(email, password);
  }
}
