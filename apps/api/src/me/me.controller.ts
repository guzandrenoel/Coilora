import { Controller, Get, UseGuards } from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';

@Controller('me')
@UseGuards(SupabaseAuthGuard)
export class MeController {
  @Get()
  getCurrentUser(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email ?? null,
    };
  }
}