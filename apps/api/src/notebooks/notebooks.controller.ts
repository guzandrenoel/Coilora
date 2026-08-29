import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import {
  createNotebookSchema,
  notebookIdSchema,
  notebookListQuerySchema,
} from '../library/library.schemas.js';
import { parseWithSchema } from '../validation/zod-validation.js';
import { NotebooksService } from './notebooks.service.js';

@Controller('notebooks')
@UseGuards(SupabaseAuthGuard)
export class NotebooksController {
  constructor(private readonly notebooks: NotebooksService) {}

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
