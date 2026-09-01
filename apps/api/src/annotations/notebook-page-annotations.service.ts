import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import { NotebookPagesService } from '../notebooks/notebook-pages.service.js';
import type { CreateAnnotationInput } from './annotations.schemas.js';

const annotationSelection = [
  'id',
  'notebook_page_id',
  'document_id',
  'document_page_number',
  'kind',
  'points',
  'color',
  'width',
  'opacity',
  'z_index',
  'revision',
  'created_at',
  'updated_at',
].join(', ');

const pageSize = 200;

@Injectable()
export class NotebookPageAnnotationsService {
  constructor(
    private readonly clients: UserDatabaseClientFactory,
    private readonly pages: NotebookPagesService,
  ) {}

  async list(
    user: AuthenticatedUser,
    notebookId: string,
    pageId: string,
    page: number,
  ) {
    const client = await this.getPageClient(user, notebookId, pageId);
    const offset = page * pageSize;

    const { data, error } = await client
      .from('annotations')
      .select(annotationSelection)
      .eq('owner_id', user.id)
      .eq('notebook_page_id', pageId)
      .is('document_id', null)
      .order('z_index', { ascending: true })
      .range(offset, offset + pageSize);

    if (error || !data) {
      throw new ServiceUnavailableException(
        'Page annotations could not be loaded.',
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
    pageId: string,
    input: CreateAnnotationInput,
  ) {
    const client = await this.getPageClient(user, notebookId, pageId);

    const { data, error } = await client
      .from('annotations')
      .insert({
        owner_id: user.id,
        notebook_page_id: pageId,
        document_id: null,
        document_page_number: null,
        kind: input.kind,
        points: input.points,
        color: input.color,
        width: input.width,
        opacity: input.opacity,
      })
      .select(annotationSelection)
      .single();

    if (error?.code === '23503' || error?.code === '42501') {
      throw new NotFoundException('The notebook page is no longer available.');
    }

    if (error || !data) {
      throw new ServiceUnavailableException(
        'The annotation could not be saved.',
      );
    }

    return data;
  }

  async remove(
    user: AuthenticatedUser,
    notebookId: string,
    pageId: string,
    annotationId: string,
  ) {
    const client = await this.getPageClient(user, notebookId, pageId);

    const { data, error } = await client
      .from('annotations')
      .delete()
      .eq('id', annotationId)
      .eq('owner_id', user.id)
      .eq('notebook_page_id', pageId)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException(
        'The annotation could not be removed.',
      );
    }

    if (!data) {
      throw new NotFoundException('The annotation was not found.');
    }

    return {
      id: data.id,
      deleted: true as const,
    };
  }

  private async getPageClient(
    user: AuthenticatedUser,
    notebookId: string,
    pageId: string,
  ) {
    await this.pages.get(user, notebookId, pageId);
    return this.clients.create(user);
  }
}
