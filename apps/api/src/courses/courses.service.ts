import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import type { CreateCourseInput } from '../library/library.schemas.js';

const courseSelection =
  'id, name, description, created_at, updated_at' as const;

@Injectable()
export class CoursesService {
  constructor(private readonly clients: UserDatabaseClientFactory) {}

  async list(user: AuthenticatedUser) {
    const client = this.clients.create(user);
    const { data, error } = await client
      .from('courses')
      .select(courseSelection)
      .is('archived_at', null)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new ServiceUnavailableException('Courses could not be loaded.');
    }

    return { items: data };
  }

  async create(user: AuthenticatedUser, input: CreateCourseInput) {
    const client = this.clients.create(user);
    const { data, error } = await client
      .from('courses')
      .insert({
        owner_id: user.id,
        name: input.name,
        description: input.description,
      })
      .select(courseSelection)
      .single();

    if (error?.code === '23505') {
      throw new ConflictException('An active course already uses this name.');
    }

    if (error || !data) {
      throw new ServiceUnavailableException('The course could not be created.');
    }

    return data;
  }

  async archive(user: AuthenticatedUser, courseId: string) {
    const client = this.clients.create(user);
    const { count, error: notebookError } = await client
      .from('notebooks')
      .select('id', {
        count: 'exact',
        head: true,
      })
      .eq('course_id', courseId)
      .is('archived_at', null)

    if (notebookError) {
      throw new ServiceUnavailableException(
        'The course could not be checked.',
      );
    }

    if ((count ?? 0) > 0) {
      throw new ConflictException(
        'Archive the notebooks in this course first.',
      );
    }

    const { data, error } = await client
      .from('courses')
      .update({
        archived_at: new Date().toISOString(),
      })
      .eq('id', courseId)
      .is('archived_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException(
        'The course could not be archived.',
      );
    }

    if (!data) {
      throw new NotFoundException('The course was not found.');
    }

    return {
      id: data.id,
      archived: true,
    };
  }
}
