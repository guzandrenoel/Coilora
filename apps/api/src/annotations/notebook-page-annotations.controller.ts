import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import {
  notebookIdSchema,
  notebookPageIdSchema,
} from '../library/library.schemas.js';
import { parseWithSchema } from '../validation/zod-validation.js';
import {
  annotationIdSchema,
  annotationListQuerySchema,
  createAnnotationSchema,
  updateAnnotationSchema,
} from './annotations.schemas.js';
import { NotebookPageAnnotationsService } from './notebook-page-annotations.service.js';

@Controller('notebooks/:notebookId/pages/:pageId/annotations')
@UseGuards(SupabaseAuthGuard)
export class NotebookPageAnnotationsController {
  constructor(private readonly annotations: NotebookPageAnnotationsService) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notebookId') notebookId: string,
    @Param('pageId') pageId: string,
    @Query() query: Record<string, unknown>,
  ) {
    const input = parseWithSchema(annotationListQuerySchema, query);

    return this.annotations.list(
      user,
      parseWithSchema(notebookIdSchema, notebookId),
      parseWithSchema(notebookPageIdSchema, pageId),
      input.page,
    );
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notebookId') notebookId: string,
    @Param('pageId') pageId: string,
    @Body() body: unknown,
  ) {
    return this.annotations.create(
      user,
      parseWithSchema(notebookIdSchema, notebookId),
      parseWithSchema(notebookPageIdSchema, pageId),
      parseWithSchema(createAnnotationSchema, body),
    );
  }

  @Delete(':annotationId')
  @HttpCode(200)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notebookId') notebookId: string,
    @Param('pageId') pageId: string,
    @Param('annotationId') annotationId: string,
  ) {
    return this.annotations.remove(
      user,
      parseWithSchema(notebookIdSchema, notebookId),
      parseWithSchema(notebookPageIdSchema, pageId),
      parseWithSchema(annotationIdSchema, annotationId),
    );
  }

  @Patch(':annotationId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notebookId') notebookId: string,
    @Param('pageId') pageId: string,
    @Param('annotationId') annotationId: string,
    @Body() body: unknown,
  ) {
    return this.annotations.update(
      user,
      parseWithSchema(notebookIdSchema, notebookId),
      parseWithSchema(notebookPageIdSchema, pageId),
      parseWithSchema(annotationIdSchema, annotationId),
      parseWithSchema(updateAnnotationSchema, body),
    );
  }
}
