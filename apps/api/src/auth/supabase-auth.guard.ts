import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import type { AuthenticatedRequest } from './auth.types.js';
import { SupabaseJwtVerifier } from './supabase-jwt-verifier.service.js';

@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly jwtVerifier: SupabaseJwtVerifier) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request =
      context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.readBearerToken(request.headers.authorization);

    request.user = await this.jwtVerifier.verifyAccessToken(token);

    return true;
  }

  private readBearerToken(authorization: string | undefined): string {
    const [scheme, token, extra] = authorization?.trim().split(/\s+/) ?? [];

    if (
      scheme?.toLowerCase() !== 'bearer' ||
      !token ||
      typeof extra !== 'undefined'
    ) {
      throw new UnauthorizedException('Bearer access token required.');
    }

    return token;
  }
}