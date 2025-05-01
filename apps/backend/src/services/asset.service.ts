import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config'; // Import ConfigService
import { lastValueFrom } from 'rxjs';
import { AxiosResponse } from 'axios';
import { Auth } from '../models/auth.model';

@Injectable()
export class AssetService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService, // Inject ConfigService
  ) {
  }

  async createAsset(name: string, email: string, password: string): Promise<boolean> {
    const baseUrl = this.configService.get<string>('UPSTREAM_BASE_URL');
    const response: AxiosResponse = await lastValueFrom(
      this.httpService.post(`${baseUrl}/assets`, {
        name,
        email,
        password,
      }),
    );

    return response.status===201;
  }

  async loginUser(email: string, password: string): Promise<Auth> {
    const baseUrl = this.configService.get<string>('UPSTREAM_BASE_URL');
    const response: AxiosResponse = await lastValueFrom(
      this.httpService.post(`${baseUrl}/auth/validate`, {
        email,
        password,
      }),
    );

    if (response.status===200) {
      return response.data;
    } else {
      throw new Error('Login failed');
    }
  }
}