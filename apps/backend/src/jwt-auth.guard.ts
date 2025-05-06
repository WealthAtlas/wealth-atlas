import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { GqlExecutionContext } from '@nestjs/graphql';
import { IS_PUBLIC_KEY } from './public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    // Handle GraphQL context
    const ctx = GqlExecutionContext.create(context).getContext();
    const token = this.extractTokenFromCookie(ctx.req);

    if (!token) {
      throw new UnauthorizedException('JWT token is missing');
    }

    try {
      const decoded = this.jwtService.verify(token);
      ctx.req.user = { userId: decoded.userId };
      return true;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired JWT token');
    }
  }

  private extractTokenFromCookie(request: any): string | null {
    const cookies = request?.cookies;
    return cookies?.token || null;
  }
}