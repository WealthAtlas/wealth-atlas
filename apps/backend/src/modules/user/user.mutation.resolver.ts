import { Args, Context, Mutation, Resolver } from '@nestjs/graphql';
import { Public } from '../../public.decorator';
import { UserService } from './user.service';

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
    return await this.userService.registerUser(name, email, password).then(() => {
      return true;
    }).catch((error) => {
      console.error('Error saving user:', error);
      throw new Error('Failed to save user');
    });
  }

  @Public()
  @Mutation(() => Boolean)
  async loginUser(
    @Args('email') email: string,
    @Args('password') password: string,
    @Context() context: any,
  ): Promise<boolean> {
    const authData = await this.userService.loginUser(email, password);
  
    context.res.cookie('token', authData.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return true;
  }
}
