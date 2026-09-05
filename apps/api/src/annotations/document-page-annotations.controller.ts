import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { z } from 'zod';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import { parseWithSchema } from '../validation/zod-validation.js';
import {
  annotationIdSchema,
  annotationListQuerySchema,
  createAnnotationSchema,
  documentPageNumberSchema,
  updateAnnotationSchema,
} from './annotations.schemas.js';
import { DocumentPageAnnotationsService } from './document-page-annotations.service.js';

const documentIdSchema = z.uuid('Select a valid document.');

@Controller('documents/:documentId')
@UseGuards(SupabaseAuthGuard)
export class DocumentPageAnnotationsController {
  constructor(private readonly annotations: DocumentPageAnnotationsService) {}

  @Get('annotations/bookmarks')
  listBookmarks(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
  ) {
    return this.annotations.listBookmarks(
      user,
      parseWithSchema(documentIdSchema, documentId),
    );
  }

  @Get('pages/:pageNumber/annotations')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Param('pageNumber') pageNumber: string,
    @Query() query: Record<string, unknown>,
  ) {
    const input = parseWithSchema(annotationListQuerySchema, query);
    return this.annotations.list(
      user,
      parseWithSchema(documentIdSchema, documentId),
      parseWithSchema(documentPageNumberSchema, pageNumber),
      input.page,
    );
  }

  @Post('pages/:pageNumber/annotations')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Param('pageNumber') pageNumber: string,
    @Body() body: unknown,
  ) {
    return this.annotations.create(
      user,
      parseWithSchema(documentIdSchema, documentId),
      parseWithSchema(documentPageNumberSchema, pageNumber),
      parseWithSchema(createAnnotationSchema, body),
    );
  }

  @Delete('pages/:pageNumber/annotations/:annotationId')
  @HttpCode(200)
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Param('pageNumber') pageNumber: string,
    @Param('annotationId') annotationId: string,
  ) {
    return this.annotations.remove(
      user,
      parseWithSchema(documentIdSchema, documentId),
      parseWithSchema(documentPageNumberSchema, pageNumber),
      parseWithSchema(annotationIdSchema, annotationId),
    );
  }

  @Patch('pages/:pageNumber/annotations/:annotationId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Param('pageNumber') pageNumber: string,
    @Param('annotationId') annotationId: string,
    @Body() body: unknown,
  ) {
    return this.annotations.update(
      user,
      parseWithSchema(documentIdSchema, documentId),
      parseWithSchema(documentPageNumberSchema, pageNumber),
      parseWithSchema(annotationIdSchema, annotationId),
      parseWithSchema(updateAnnotationSchema, body),
    );
  }

  @Put('pages/:pageNumber/bookmark')
  setBookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Param('pageNumber') pageNumber: string,
  ) {
    return this.annotations.setBookmark(
      user,
      parseWithSchema(documentIdSchema, documentId),
      parseWithSchema(documentPageNumberSchema, pageNumber),
      true,
    );
  }

  @Delete('pages/:pageNumber/bookmark')
  @HttpCode(200)
  removeBookmark(
    @CurrentUser() user: AuthenticatedUser,
    @Param('documentId') documentId: string,
    @Param('pageNumber') pageNumber: string,
  ) {
    return this.annotations.setBookmark(
      user,
      parseWithSchema(documentIdSchema, documentId),
      parseWithSchema(documentPageNumberSchema, pageNumber),
      false,
    );
  }
}
