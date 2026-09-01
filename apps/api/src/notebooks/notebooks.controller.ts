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
  createNotebookPageSchema,
  createNotebookSchema,
  updateNotebookSchema,
  notebookIdSchema,
  notebookListQuerySchema,
  notebookPageIdSchema,
  notebookPageListQuerySchema,
  updateNotebookPageSchema,
} from '../library/library.schemas.js';
import { parseWithSchema } from '../validation/zod-validation.js';
import { NotebookPagesService } from './notebook-pages.service.js';
import { NotebooksService } from './notebooks.service.js';

@Controller('notebooks')
@UseGuards(SupabaseAuthGuard)
export class NotebooksController {
  constructor(
    private readonly notebooks: NotebooksService,
    private readonly pages: NotebookPagesService,
  ) {}

  @Get()
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: Record<string, unknown>,
  ) {
    return this.notebooks.list(
      user,
      parseWithSchema(notebookListQuerySchema, query),
    );
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.notebooks.create(
      user,
      parseWithSchema(createNotebookSchema, body),
    );
  }

  @Get(':notebookId/pages')
  listPages(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notebookId') notebookId: string,
    @Query() query: Record<string, unknown>,
  ) {
    const input = parseWithSchema(notebookPageListQuerySchema, query);
    return this.pages.list(
      user,
      parseWithSchema(notebookIdSchema, notebookId),
      input.page,
    );
  }

  @Get(':notebookId/pages/:pageId')
  getPage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notebookId') notebookId: string,
    @Param('pageId') pageId: string,
  ) {
    return this.pages.get(
      user,
      parseWithSchema(notebookIdSchema, notebookId),
      parseWithSchema(notebookPageIdSchema, pageId),
    );
  }

  @Post(':notebookId/pages')
  createPage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notebookId') notebookId: string,
    @Body() body: unknown,
  ) {
    return this.pages.create(
      user,
      parseWithSchema(notebookIdSchema, notebookId),
      parseWithSchema(createNotebookPageSchema, body),
    );
  }

  @Patch(':notebookId/pages/:pageId')
  updatePage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notebookId') notebookId: string,
    @Param('pageId') pageId: string,
    @Body() body: unknown,
  ) {
    return this.pages.update(
      user,
      parseWithSchema(notebookIdSchema, notebookId),
      parseWithSchema(notebookPageIdSchema, pageId),
      parseWithSchema(updateNotebookPageSchema, body),
    );
  }

  @Patch(':notebookId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notebookId') notebookId: string,
    @Body() body: unknown,
  ) {
    return this.notebooks.update(
      user,
      parseWithSchema(notebookIdSchema, notebookId),
      parseWithSchema(updateNotebookSchema, body),
    );
  }

  @Delete(':notebookId')
  @HttpCode(200)
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('notebookId') notebookId: string,
  ) {
    return this.notebooks.archive(
      user,
      parseWithSchema(notebookIdSchema, notebookId),
    );
  }
}
