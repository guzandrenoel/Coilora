import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import type { CreateDocumentInput } from './documents.schemas.js';

const documentSelection =
  'id, notebook_id, title, original_filename, source_type, media_type, status, byte_size, revision, created_at, updated_at' as const;

const pageSize = 20;

@Injectable()
export class DocumentsService {
  constructor(private readonly clients: UserDatabaseClientFactory) {}

  async list(
    user: AuthenticatedUser,
    notebookId: string,
    page: number,
  ) {
    const client = await this.getNotebookClient(user, notebookId);
    const offset = page * pageSize;

    const { data, error } = await client
      .from('documents')
      .select(documentSelection)
      .eq('owner_id', user.id)
      .eq('notebook_id', notebookId)
      .is('deleted_at', null)
      .neq('status', 'awaiting_upload')
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .range(offset, offset + pageSize);

    if (error || !data) {
      throw new ServiceUnavailableException(
        'Your saved documents could not be loaded.',
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
    input: CreateDocumentInput,
  ) {
    const client = await this.getNotebookClient(user, notebookId);

    const { data, error } = await client
      .from('documents')
      .insert({
        owner_id: user.id,
        notebook_id: notebookId,
        title: input.title,
        original_filename: input.originalFilename,
        source_type: input.sourceType,
        media_type: input.mediaType,
        byte_size: input.byteSize,
        status: 'awaiting_upload',
      })
      .select('id, status, revision')
      .single();

    if (error?.code === '23503') {
      throw new NotFoundException(
        'The notebook is no longer available.',
      );
    }

    if (error || !data) {
      throw new ServiceUnavailableException(
        'The document could not be created.',
      );
    }

    return data;
  }

  private async getNotebookClient(
    user: AuthenticatedUser,
    notebookId: string,
  ) {
    const client = this.clients.create(user);

    const { data: notebook, error } = await client
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

    if (!notebook) {
      throw new NotFoundException('The notebook was not found.');
    }

    return client;
  }
}