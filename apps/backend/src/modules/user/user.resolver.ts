import { Args, Context, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Context as CustomContext } from '../../context';
import { Public } from '../../public.decorator';
import { UserDTO, UserLoginInput, UserRegisterInput } from './user.graphql';
import { UserService } from './user.service';

@Resolver(() => UserDTO)
export class UserResolver {
  constructor(private readonly userService: UserService) { }

  @Public()
  @Mutation(() => Boolean)
  async registerUser(
    @Args('input') input: UserRegisterInput,
  ): Promise<boolean> {
    return await this.userService.registerUser(input).then(() => {
      return true;
    }).catch((error) => {
      console.error('Error saving user:', error);
      throw new Error('Failed to save user');
    });
  }

  @Public()
  @Mutation(() => Boolean)
  async loginUser(
    @Args('input') input: UserLoginInput,
    @Context() context: any,
  ): Promise<boolean> {
    const token = await this.userService.loginUser(input);

    context.res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    return true;
  }

  @Public()
  @Mutation(() => Boolean)
  async logoutUser(
    @Context() context: any,
  ): Promise<boolean> {
    context.res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
    });

    return true;
  }

  @Query(() => UserDTO)
  async user(@Context() context: CustomContext): Promise<UserDTO> {
    const userId = context.req.user?.userId || '';
    return this.userService.getUser(userId);
  }
}