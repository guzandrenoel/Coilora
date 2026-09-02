import {
  Controller,
  Body,
  Header,
  HttpCode,
  Patch,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { DocumentReadService } from './document-read.service.js';
import { documentPageCountSchema } from './documents.schemas.js';
import { parseWithSchema } from '../validation/zod-validation.js';

@Controller('documents')
@UseGuards(SupabaseAuthGuard)
export class DocumentReadController {
  constructor(private readonly reads: DocumentReadService) {}

  @Post(':documentId/preview-session')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  createPreviewSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
  ) {
    return this.reads.createSession(user, documentId, true);
  }

  @Post(':documentId/read-session')
  @HttpCode(200)
  @Header('Cache-Control', 'private, no-store')
  createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
  ) {
    return this.reads.createSession(user, documentId);
  }

  @Patch(':documentId/page-count')
  @HttpCode(200)
  recordPageCount(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
    @Body() body: unknown,
  ) {
    const input = parseWithSchema(documentPageCountSchema, body);
    return this.reads.recordPageCount(user, documentId, input.pageCount);
  }
}
