import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { SupabaseAuthGuard } from '../auth/supabase-auth.guard.js';
import {
  courseIdSchema,
  createCourseSchema,
  updateCourseSchema,
} from '../library/library.schemas.js';
import { parseWithSchema } from '../validation/zod-validation.js';
import { CoursesService } from './courses.service.js';

@Controller('courses')
@UseGuards(SupabaseAuthGuard)
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.courses.list(user);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: unknown) {
    return this.courses.create(user, parseWithSchema(createCourseSchema, body));
  }

  @Patch(':courseId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
    @Body() body: unknown,
  ) {
    return this.courses.update(
      user,
      parseWithSchema(courseIdSchema, courseId),
      parseWithSchema(updateCourseSchema, body),
    );
  }

  @Delete(':courseId')
  @HttpCode(200)
  archive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('courseId') courseId: string,
  ) {
    return this.courses.archive(
      user,
      parseWithSchema(courseIdSchema, courseId),
    );
  }
}
