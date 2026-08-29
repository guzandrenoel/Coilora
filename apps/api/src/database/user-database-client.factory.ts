import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { Environment } from '../config/environment.js';
import type { Database } from './database.types.js';

@Injectable()
export class UserDatabaseClientFactory {
  private readonly publishableKey: string;
  private readonly supabaseUrl: string;

  constructor(config: ConfigService<Environment, true>) {
    this.supabaseUrl = config.get('SUPABASE_URL', { infer: true });
    this.publishableKey = config.get('SUPABASE_PUBLISHABLE_KEY', {
      infer: true,
    });
  }

  create(user: AuthenticatedUser): SupabaseClient<Database> {
    return createClient<Database>(this.supabaseUrl, this.publishableKey, {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
      global: {
        headers: {
          Authorization: `Bearer ${user.accessToken}`,
        },
      },
    });
  }
}
