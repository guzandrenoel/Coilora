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
import { DocumentUploadCompletionService } from './document-upload-completion.service.js';
import { DocumentUploadsService } from './document-uploads.service.js';

@Controller('documents')
@UseGuards(SupabaseAuthGuard)
export class DocumentUploadsController {
  constructor(
    private readonly uploads: DocumentUploadsService,
    private readonly completion: DocumentUploadCompletionService,
  ) {}

  @Post(':documentId/upload-session')
  @Header('Cache-Control', 'no-store')
  createSession(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
  ) {
    return this.uploads.createSession(user, documentId);
  }

  @Post(':documentId/upload-complete')
  @HttpCode(200)
  @Header('Cache-Control', 'no-store')
  complete(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId', new ParseUUIDPipe()) documentId: string,
  ) {
    return this.completion.complete(user, documentId);
  }
}