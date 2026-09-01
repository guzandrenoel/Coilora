import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import type { CreateNotebookPageInput } from '../library/library.schemas.js';

const notebookPageSelection =
  'id, notebook_id, position, paper_style, created_at, updated_at' as const;
const pageSize = 50;

@Injectable()
export class NotebookPagesService {
  constructor(private readonly clients: UserDatabaseClientFactory) {}

  async list(user: AuthenticatedUser, notebookId: string, page: number) {
    const client = await this.getNotebookClient(user, notebookId);
    const offset = page * pageSize;
    const { data, error } = await client
      .from('notebook_pages')
      .select(notebookPageSelection)
      .eq('owner_id', user.id)
      .eq('notebook_id', notebookId)
      .order('position', { ascending: true })
      .range(offset, offset + pageSize);

    if (error || !data) {
      throw new ServiceUnavailableException(
        'Notebook pages could not be loaded.',
      );
    }

    return {
      items: data.slice(0, pageSize),
      nextPage: data.length > pageSize ? page + 1 : null,
    };
  }

  async create(
    user: AuthenticatedUser,
    notebookId: string,
    input: CreateNotebookPageInput,
  ) {
    const client = await this.getNotebookClient(user, notebookId);
    const { data, error } = await client
      .from('notebook_pages')
      .insert({
        owner_id: user.id,
        notebook_id: notebookId,
        paper_style: input.paperStyle,
      })
      .select(notebookPageSelection)
      .single();

    if (error?.code === '23503' || error?.code === '42501') {
      throw new NotFoundException('The notebook is no longer available.');
    }
    if (error || !data) {
      throw new ServiceUnavailableException('The page could not be created.');
    }
    return data;
  }

  private async getNotebookClient(user: AuthenticatedUser, notebookId: string) {
    const client = this.clients.create(user);
    const { data, error } = await client
      .from('notebooks')
      .select('id')
      .eq('id', notebookId)
      .eq('owner_id', user.id)
      .is('archived_at', null)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException(
        'The notebook could not be checked.',
      );
    }
    if (!data) throw new NotFoundException('The notebook was not found.');
    return client;
  }
}
