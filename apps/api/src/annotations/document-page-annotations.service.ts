import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import type {
  CreateAnnotationInput,
  UpdateAnnotationInput,
} from './annotations.schemas.js';

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
  'text_content',
  'font_size',
  'z_index',
  'revision',
  'created_at',
  'updated_at',
].join(', ');

const pageSize = 200;

@Injectable()
export class DocumentPageAnnotationsService {
  constructor(private readonly clients: UserDatabaseClientFactory) {}

  async list(
    user: AuthenticatedUser,
    documentId: string,
    documentPageNumber: number,
    page: number,
  ) {
    const { client } = await this.getDocument(
      user,
      documentId,
      documentPageNumber,
    );
    const offset = page * pageSize;
    const { data, error } = await client
      .from('annotations')
      .select(annotationSelection)
      .eq('owner_id', user.id)
      .eq('document_id', documentId)
      .eq('document_page_number', documentPageNumber)
      .is('notebook_page_id', null)
      .order('z_index', { ascending: true })
      .range(offset, offset + pageSize);

    if (error || !data) {
      throw new ServiceUnavailableException(
        'PDF annotations could not be loaded.',
      );
    }

    return {
      items: data.slice(0, pageSize),
      nextPage: data.length > pageSize ? page + 1 : null,
    };
  }

  async create(
    user: AuthenticatedUser,
    documentId: string,
    documentPageNumber: number,
    input: CreateAnnotationInput,
  ) {
    const { client } = await this.getDocument(
      user,
      documentId,
      documentPageNumber,
    );
    const { data, error } = await client
      .from('annotations')
      .insert({
        ...(input.id ? { id: input.id } : {}),
        owner_id: user.id,
        notebook_page_id: null,
        document_id: documentId,
        document_page_number: documentPageNumber,
        kind: input.kind,
        points: input.points,
        color: input.color,
        width: input.width,
        opacity: input.opacity,
        ...(input.kind === 'text'
          ? { text_content: input.text, font_size: input.fontSize }
          : {}),
      })
      .select(annotationSelection)
      .single();

    if (error?.code === '23505' && input.id) {
      const { data: existing, error: lookupError } = await client
        .from('annotations')
        .select(annotationSelection)
        .eq('id', input.id)
        .eq('owner_id', user.id)
        .eq('document_id', documentId)
        .eq('document_page_number', documentPageNumber)
        .is('notebook_page_id', null)
        .maybeSingle();
      if (!lookupError && existing) return existing;
      throw new ServiceUnavailableException(
        'The annotation retry could not be verified.',
      );
    }
    if (error?.code === '23503' || error?.code === '42501') {
      throw new NotFoundException('The PDF page is no longer available.');
    }
    if (error || !data) {
      throw new ServiceUnavailableException(
        'The PDF annotation could not be saved.',
      );
    }
    return data;
  }

  async remove(
    user: AuthenticatedUser,
    documentId: string,
    documentPageNumber: number,
    annotationId: string,
  ) {
    const { client } = await this.getDocument(
      user,
      documentId,
      documentPageNumber,
    );
    const { data, error } = await client
      .from('annotations')
      .delete()
      .eq('id', annotationId)
      .eq('owner_id', user.id)
      .eq('document_id', documentId)
      .eq('document_page_number', documentPageNumber)
      .select('id')
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException(
        'The PDF annotation could not be removed.',
      );
    }
    if (!data) throw new NotFoundException('The annotation was not found.');
    return { id: data.id, deleted: true as const };
  }

  async update(
    user: AuthenticatedUser,
    documentId: string,
    documentPageNumber: number,
    annotationId: string,
    input: UpdateAnnotationInput,
  ) {
    const { client } = await this.getDocument(
      user,
      documentId,
      documentPageNumber,
    );
    const { data, error } = await client
      .from('annotations')
      .update({
        points: input.points,
        revision: input.revision + 1,
        ...(input.text !== undefined ? { text_content: input.text } : {}),
        ...(input.fontSize !== undefined ? { font_size: input.fontSize } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
      })
      .eq('id', annotationId)
      .eq('owner_id', user.id)
      .eq('document_id', documentId)
      .eq('document_page_number', documentPageNumber)
      .is('notebook_page_id', null)
      .eq('revision', input.revision)
      .select(annotationSelection)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException(
        'The PDF annotation could not be updated.',
      );
    }
    if (data) return data;

    const { data: existing, error: lookupError } = await client
      .from('annotations')
      .select('id')
      .eq('id', annotationId)
      .eq('owner_id', user.id)
      .eq('document_id', documentId)
      .eq('document_page_number', documentPageNumber)
      .is('notebook_page_id', null)
      .maybeSingle();

    if (lookupError) {
      throw new ServiceUnavailableException(
        'The PDF annotation update could not be checked.',
      );
    }
    if (!existing) throw new NotFoundException('The annotation was not found.');
    throw new ConflictException(
      'The annotation changed before it could be updated. Try again.',
    );
  }

  async listBookmarks(user: AuthenticatedUser, documentId: string) {
    const { client } = await this.getDocument(user, documentId);
    const pages: number[] = [];
    let cursor = 0;
    // Keyset batches avoid silently losing bookmarks beyond the row limit.
    while (cursor < 5000) {
      const { data, error } = await client
        .from('page_bookmarks')
        .select('document_page_number')
        .eq('owner_id', user.id)
        .eq('document_id', documentId)
        .gt('document_page_number', cursor)
        .order('document_page_number', { ascending: true })
        .limit(500);
      if (error || !data)
        throw new ServiceUnavailableException(
          'PDF bookmarks could not be loaded.',
        );
      const batch = data.flatMap((item) =>
        item.document_page_number === null ? [] : [item.document_page_number],
      );
      pages.push(...batch);
      if (data.length < 500) break;
      const last = batch[batch.length - 1];
      if (!last || last <= cursor)
        throw new ServiceUnavailableException(
          'PDF bookmark pagination failed.',
        );
      cursor = last;
    }
    return { pages };
  }

  async setBookmark(
    user: AuthenticatedUser,
    documentId: string,
    documentPageNumber: number,
    bookmarked: boolean,
  ) {
    const { client, notebookId } = await this.getDocument(
      user,
      documentId,
      documentPageNumber,
    );

    if (bookmarked) {
      const { error } = await client.from('page_bookmarks').insert({
        owner_id: user.id,
        notebook_id: notebookId,
        notebook_page_id: null,
        document_id: documentId,
        document_page_number: documentPageNumber,
      });
      if (error && error.code !== '23505') {
        throw new ServiceUnavailableException(
          'The PDF page could not be bookmarked.',
        );
      }
    } else {
      const { error } = await client
        .from('page_bookmarks')
        .delete()
        .eq('owner_id', user.id)
        .eq('document_id', documentId)
        .eq('document_page_number', documentPageNumber);
      if (error) {
        throw new ServiceUnavailableException(
          'The PDF bookmark could not be removed.',
        );
      }
    }

    return { documentId, documentPageNumber, bookmarked };
  }

  private async getDocument(
    user: AuthenticatedUser,
    documentId: string,
    documentPageNumber?: number,
  ) {
    const client = this.clients.create(user);
    const { data: document, error } = await client
      .from('documents')
      .select('id, notebook_id, page_count, source_type, status')
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException('The PDF could not be checked.');
    }
    if (!document) throw new NotFoundException('The document was not found.');
    if (document.source_type !== 'pdf' || document.status !== 'uploaded') {
      throw new ConflictException('This document cannot be annotated.');
    }
    if (
      documentPageNumber !== undefined &&
      document.page_count !== null &&
      documentPageNumber > document.page_count
    ) {
      throw new NotFoundException('The PDF page was not found.');
    }

    const { data: notebook, error: notebookError } = await client
      .from('notebooks')
      .select('id')
      .eq('id', document.notebook_id)
      .eq('owner_id', user.id)
      .is('archived_at', null)
      .maybeSingle();

    if (notebookError) {
      throw new ServiceUnavailableException(
        'The notebook could not be checked.',
      );
    }
    if (!notebook) throw new NotFoundException('The notebook was not found.');

    return { client, notebookId: document.notebook_id };
  }
}
