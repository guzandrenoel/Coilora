import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { notebookIdSchema } from '../library/library.schemas.js';
import { z } from 'zod';
import { parseWithSchema } from '../validation/zod-validation.js';
import {
  createDocumentSchema,
  documentBookmarkSchema,
  listDocumentsQuerySchema,
  moveDocumentSchema,
} from './documents.schemas.js';
import { DocumentsService } from './documents.service.js';

@Controller('notebooks/:notebookId/documents')
@UseGuards(SupabaseAuthGuard)
export class DocumentsController {
  constructor(private readonly documents: DocumentsService) {}

  @Patch(':documentId/move')
  @Header('Cache-Control', 'no-store')
  move(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notebookId') notebookId: string,
    @Param('documentId') documentId: string,
    @Body() body: unknown,
  ) {
    const input = parseWithSchema(moveDocumentSchema, body);
    return this.documents.move(
      user,
      parseWithSchema(notebookIdSchema, notebookId),
      parseWithSchema(z.uuid('Select a valid document.'), documentId),
      input.destinationNotebookId,
    );
  }

  @Patch(':documentId/bookmark')
  @Header('Cache-Control', 'no-store')
  setBookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notebookId') notebookId: string,
    @Param('documentId') documentId: string,
    @Body() body: unknown,
  ) {
    const input = parseWithSchema(documentBookmarkSchema, body);
    return this.documents.setBookmark(
      user,
      parseWithSchema(notebookIdSchema, notebookId),
      parseWithSchema(z.uuid('Select a valid document.'), documentId),
      input.bookmarked,
    );
  }

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
