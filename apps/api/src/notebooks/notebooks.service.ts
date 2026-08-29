import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import type {
  CreateNotebookInput,
  NotebookListQuery,
} from '../library/library.schemas.js';

const notebookSelection =
  'id, course_id, title, description, created_at, updated_at' as const;

@Injectable()
export class NotebooksService {
  constructor(private readonly clients: UserDatabaseClientFactory) {}

  async list(user: AuthenticatedUser, input: NotebookListQuery) {
    const client = this.clients.create(user);
    let query = client
      .from('notebooks')
      .select(notebookSelection)
      .is('archived_at', null)
      .order('updated_at', { ascending: false });

    if (input.courseId) {
      query = query.eq('course_id', input.courseId);
    }

    const { data, error } = await query;

    if (error) {
      throw new ServiceUnavailableException('Notebooks could not be loaded.');
    }

    return { items: data };
  }

  async create(user: AuthenticatedUser, input: CreateNotebookInput) {
    const client = this.clients.create(user);
    const { data, error } = await client
      .from('notebooks')
      .insert({
        owner_id: user.id,
        course_id: input.courseId,
        title: input.title,
        description: input.description,
      })
      .select(notebookSelection)
      .single();

    if (error?.code === '23503') {
      throw new BadRequestException('The selected course is unavailable.');
    }

    if (error || !data) {
      throw new ServiceUnavailableException('The notebook could not be created.');
    }

    return data;
  }

  async archive(user: AuthenticatedUser, notebookId: string) {
    const client = this.clients.create(user);
    const { data, error } = await client
      .from('notebooks')
      .update({
        archived_at: new Date().toISOString(),
      })
      .eq('id', notebookId)
      .is('archived_at', null)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException(
        'The notebook could not be archived.',
      );
    }

    if (!data) {
      throw new NotFoundException('The notebook was not found.');
    }

    return {
      id: data.id,
      archived: true,
    };
  }
}
