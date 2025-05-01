import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import { InjectModel } from '@nestjs/mongoose';
import { AxiosResponse } from 'axios';
import { Model } from 'mongoose';
import { lastValueFrom } from 'rxjs';
import { UserEntity } from '../entities/user.entity';
import { Auth } from '../models/auth.model';
import { User } from '../models/user.model';

@Injectable()
export class UserService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService, // Inject ConfigService
    @InjectModel(UserEntity.name) private userModel: Model<UserEntity>
  ) { }

  async registerUser(
    name: string,
    email: string,
    password: string,
  ): Promise<void> {

    const user = new this.userModel({
      name,
      email
    });

    return user.save().then(() => { }).catch((error) => {
      console.error('Error saving user:', error);
      throw new Error('Failed to save user');
    });
  }

  async loginUser(email: string, password: string): Promise<Auth> {
    const baseUrl = this.configService.get<string>('UPSTREAM_BASE_URL');
    const response: AxiosResponse = await lastValueFrom(
      this.httpService.post(`${baseUrl}/auth/validate`, {
        email,
        password,
      }),
    );

    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error('Login failed');
    }
  }

  async getUser(userId: string): Promise<User> {
    const baseUrl = this.configService.get<string>('UPSTREAM_BASE_URL');
    const response: AxiosResponse = await lastValueFrom(
      this.httpService.get(`${baseUrl}/users/${userId}`),
    );

    if (response.status === 200) {
      return response.data;
    } else {
      throw new Error('Failed to fetch users');
    }
  }
}
