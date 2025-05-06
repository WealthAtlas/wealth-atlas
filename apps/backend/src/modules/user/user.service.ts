import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as argon2 from 'argon2';
import { UserEntity } from './user.entity';
import { UserDTO, UserLoginInput, UserRegisterInput } from './user.graphql';

@Injectable()
export class UserService {
  constructor(
    private readonly jwtService: JwtService,
    @InjectModel(UserEntity.name) private userModel: Model<UserEntity>
  ) { }

  async registerUser(
    input: UserRegisterInput
  ): Promise<void> {
    const passwordHash = await argon2.hash(input.password);

    const user = new this.userModel({
      name: input.name,
      email: input.email,
      passwordHash: passwordHash,
    });

    return user.save().then(() => { });
  }

  async loginUser(input: UserLoginInput): Promise<string> {
    const user = await this.userModel.findOne({ email: input.email });

    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isPasswordValid = await argon2.verify(user.passwordHash, input.password);

    if (!isPasswordValid) {
      throw new Error('Invalid email or password');
    }

    const payload = { sub: user._id, email: user.email };
    const token = this.jwtService.sign(payload);

    return token;
  }

  async getUser(userId: string): Promise<UserDTO> {
    const user = await this.userModel.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }
    return {
      name: user.name,
      email: user.email,
    };
  }
}
