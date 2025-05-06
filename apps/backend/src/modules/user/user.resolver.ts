import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Context as CustomContext } from '../../context';
import { UserDTO } from './user.graphql';
import { UserService } from './user.service';
import { Public } from '../../public.decorator';

@Resolver(() => UserDTO)
export class UserResolver {
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
    });
  }

  @Public()
  @Mutation(() => Boolean)
  async loginUser(
    @Args('email') email: string,
    @Args('password') password: string,
    @Context() context: any,
  ): Promise<boolean> {
    const token = await this.userService.loginUser(email, password);

    context.res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return true;
  }

  @Query(() => UserDTO)
  async user(@Context() context: CustomContext): Promise<UserDTO> {
    const userId = context.req.user?.userId || '';
    return this.userService.getUser(userId);
  }
}