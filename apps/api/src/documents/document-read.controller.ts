import {
  Controller,
  Header,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { DocumentReadService } from './document-read.service.js';

@Controller('documents')
@UseGuards(SupabaseAuthGuard)
export class DocumentReadController {
  constructor(private readonly reads: DocumentReadService) {}

  @Post(':documentId/read-session')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
  ) {
    return this.reads.createSession(user, documentId);
  }
}