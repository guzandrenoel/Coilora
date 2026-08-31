import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { notebookIdSchema } from '../library/library.schemas.js';
import { parseWithSchema } from '../validation/zod-validation.js';
import {
  createDocumentSchema,
  listDocumentsQuerySchema,
} from './documents.schemas.js';
import { DocumentsService } from './documents.service.js';

@Controller('notebooks/:notebookId/documents')
@UseGuards(SupabaseAuthGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Get()
  @Header('Cache-Control', 'no-store')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notebookId') notebookId: string,
    @Query() query: unknown,
  ) {
    const input = parseWithSchema(listDocumentsQuerySchema, query);

    return this.documents.list(
      user,
      parseWithSchema(notebookIdSchema, notebookId),
      input.page,
    );
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notebookId') notebookId: string,
    @Body() body: unknown,
  ) {
    return this.documents.create(
      user,
      parseWithSchema(notebookIdSchema, notebookId),
      parseWithSchema(createDocumentSchema, body),
    );
  }
}