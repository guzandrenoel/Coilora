import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

import type { Environment } from '../config/environment.js';
import type { AuthenticatedUser } from './auth.types.js';

@Injectable()
export class SupabaseJwtVerifier {
  private readonly audience: string;
  private readonly issuer: string;
  private readonly jwks: ReturnType<typeof createRemoteJWKSet>;

  constructor(config: ConfigService<Environment, true>) {
    const supabaseUrl = config.get('SUPABASE_URL', { infer: true });

    this.audience = config.get('SUPABASE_JWT_AUDIENCE', { infer: true });
    this.issuer = `${supabaseUrl}/auth/v1`;
    this.jwks = createRemoteJWKSet(
      new URL(`${this.issuer}/.well-known/jwks.json`),
    );
  }

  async verifyAccessToken(token: string): Promise<AuthenticatedUser> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
        audience: this.audience,
      });

      if (
        typeof payload.sub !== 'string' ||
        payload.sub.length === 0 ||
        payload.role !== 'authenticated'
      ) {
        throw new UnauthorizedException();
      }

      return {
        id: payload.sub,
        role: 'authenticated',
        ...(typeof payload.email === 'string'
          ? { email: payload.email }
          : {}),
        ...(typeof payload.session_id === 'string'
          ? { sessionId: payload.session_id }
          : {}),
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired access token.');
    }
  }
}