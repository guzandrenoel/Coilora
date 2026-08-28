import { Module } from '@nestjs/common';

import { SupabaseAuthGuard } from './supabase-auth.guard.js';
import { SupabaseJwtVerifier } from './supabase-jwt-verifier.service.js';

@Module({
  providers: [SupabaseJwtVerifier, SupabaseAuthGuard],
  exports: [SupabaseJwtVerifier, SupabaseAuthGuard],
})
export class AuthModule {}