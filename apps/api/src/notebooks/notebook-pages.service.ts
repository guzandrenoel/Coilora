import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import type { CreateNotebookPageInput } from '../library/library.schemas.js';
import type { UpdateNotebookPageInput } from '../library/library.schemas.js';
import {
  isMissingPageTrashColumn,
  pageTrashUnavailable,
} from './page-trash-schema.js';

const notebookPageSelection =
  'id, notebook_id, title, position, paper_style, document_id, after_document_page_number, created_at, updated_at' as const;
const pageSize = 50;

@Injectable()
export class NotebookPagesService {
  constructor(private readonly clients: UserDatabaseClientFactory) {}

  async list(user: AuthenticatedUser, notebookId: string, page: number) {
    const client = await this.getNotebookClient(user, notebookId);
    const offset = page * pageSize;
    const load = (activeOnly: boolean) => {
      let query = client
        .from('notebook_pages')
        .select(notebookPageSelection)
        .eq('owner_id', user.id)
        .eq('notebook_id', notebookId);
      if (activeOnly) query = query.is('deleted_at', null);
      return query
        .order('position', { ascending: true })
        .range(offset, offset + pageSize);
    };
    let result = await load(true);
    if (isMissingPageTrashColumn(result.error)) result = await load(false);
    const { data, error } = result;

    if (error || !data) {
      throw new ServiceUnavailableException(
        'Notebook pages could not be loaded.',
      );
    }

    const bookmarks = await this.getBookmarkIds(
      client,
      user.id,
      notebookId,
      data.map((item) => item.id),
    );

    return {
      items: data.slice(0, pageSize).map((item) => ({
        ...item,
        bookmarked: bookmarks.has(item.id),
      })),
      nextPage: data.length > pageSize ? page + 1 : null,
    };
  }

  async get(user: AuthenticatedUser, notebookId: string, pageId: string) {
    const client = await this.getNotebookClient(user, notebookId);
    const load = (activeOnly: boolean) => {
      let query = client
        .from('notebook_pages')
        .select(notebookPageSelection)
        .eq('id', pageId)
        .eq('owner_id', user.id)
        .eq('notebook_id', notebookId);
      if (activeOnly) query = query.is('deleted_at', null);
      return query.maybeSingle();
    };
    let result = await load(true);
    if (isMissingPageTrashColumn(result.error)) result = await load(false);
    const { data, error } = result;

    if (error) {
      throw new ServiceUnavailableException(
        'The notebook page could not be loaded.',
      );
    }

    if (!data) {
      throw new NotFoundException('The notebook page was not found.');
    }

    const bookmarks = await this.getBookmarkIds(client, user.id, notebookId, [
      pageId,
    ]);

    return {
      ...data,
      bookmarked: bookmarks.has(pageId),
    };
  }

  async create(
    user: AuthenticatedUser,
    notebookId: string,
    input: CreateNotebookPageInput,
  ) {
    const client = await this.getNotebookClient(user, notebookId);

    if (input.documentId) {
      const { data: document, error: documentError } = await client
        .from('documents')
        .select('id')
        .eq('id', input.documentId)
        .eq('notebook_id', notebookId)
        .eq('owner_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (documentError) {
        throw new ServiceUnavailableException(
          'The document could not be checked.',
        );
      }
      if (!document) {
        throw new NotFoundException('The document was not found.');
      }
    }

    const { data, error } = await client
      .from('notebook_pages')
      .insert({
        owner_id: user.id,
        notebook_id: notebookId,
        title: input.title,
        paper_style: input.paperStyle,
        document_id: input.documentId,
        after_document_page_number: input.afterDocumentPageNumber,
      })
      .select(notebookPageSelection)
      .single();

    if (error?.code === '23503' || error?.code === '42501') {
      throw new NotFoundException('The notebook is no longer available.');
    }
    if (error || !data) {
      throw new ServiceUnavailableException('The page could not be created.');
    }
    return { ...data, bookmarked: false };
  }

  async update(
    user: AuthenticatedUser,
    notebookId: string,
    pageId: string,
    input: UpdateNotebookPageInput,
  ) {
    const client = await this.getNotebookClient(user, notebookId);
    const existing = await this.get(user, notebookId, pageId);

    let page = existing;
    if (input.title !== undefined) {
      const rename = (activeOnly: boolean) => {
        let query = client
          .from('notebook_pages')
          .update({ title: input.title })
          .eq('id', pageId)
          .eq('notebook_id', notebookId)
          .eq('owner_id', user.id);
        if (activeOnly) query = query.is('deleted_at', null);
        return query.select(notebookPageSelection).maybeSingle();
      };
      let result = await rename(true);
      if (isMissingPageTrashColumn(result.error)) result = await rename(false);
      const { data, error } = result;

      if (error) {
        throw new ServiceUnavailableException(
          'The page name could not be updated.',
        );
      }
      if (!data)
        throw new NotFoundException('The notebook page was not found.');
      page = { ...data, bookmarked: existing.bookmarked };
    }

    if (input.bookmarked !== undefined) {
      if (input.bookmarked) {
        const { error } = await client.from('page_bookmarks').insert({
          owner_id: user.id,
          notebook_id: notebookId,
          notebook_page_id: pageId,
          document_id: null,
          document_page_number: null,
        });
        if (error?.code === '42501' || error?.code === '23503') {
          throw new NotFoundException(
            'The notebook page is no longer available.',
          );
        }
        if (error && error.code !== '23505') {
          throw new ServiceUnavailableException(
            'The page could not be bookmarked.',
          );
        }
      } else {
        const { error } = await client
          .from('page_bookmarks')
          .delete()
          .eq('owner_id', user.id)
          .eq('notebook_id', notebookId)
          .eq('notebook_page_id', pageId);
        if (error) {
          throw new ServiceUnavailableException(
            'The bookmark could not be removed.',
          );
        }
      }
      page = { ...page, bookmarked: input.bookmarked };
    }

    return page;
  }

  async remove(user: AuthenticatedUser, notebookId: string, pageId: string) {
    const client = await this.getNotebookClient(user, notebookId);
    const { data, error } = await client
      .from('notebook_pages')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', pageId)
      .eq('notebook_id', notebookId)
      .eq('owner_id', user.id)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (isMissingPageTrashColumn(error)) {
      throw new ServiceUnavailableException(pageTrashUnavailable);
    }
    if (error?.code === '42501' || error?.code === '23503') {
      throw new NotFoundException('The notebook page is no longer available.');
    }
    if (error) {
      throw new ServiceUnavailableException('The page could not be deleted.');
    }
    if (!data) {
      // Preserve the first deletion timestamp and make retries safe, but never
      // report success for a missing page or a page outside this notebook.
      const { data: existing, error: lookupError } = await client
        .from('notebook_pages')
        .select('id, deleted_at')
        .eq('id', pageId)
        .eq('notebook_id', notebookId)
        .eq('owner_id', user.id)
        .maybeSingle();
      if (lookupError) {
        throw new ServiceUnavailableException(
          'The page deletion could not be verified.',
        );
      }
      if (!existing)
        throw new NotFoundException('The notebook page was not found.');
      if (!existing.deleted_at) {
        throw new ConflictException(
          'The page changed during deletion. Please try again.',
        );
      }
    }
    return { id: pageId, notebook_id: notebookId, deleted: true as const };
  }

  async restore(user: AuthenticatedUser, notebookId: string, pageId: string) {
    const client = await this.getNotebookClient(user, notebookId);
    const { error } = await client
      .from('notebook_pages')
      .update({ deleted_at: null })
      .eq('id', pageId)
      .eq('notebook_id', notebookId)
      .eq('owner_id', user.id)
      .not('deleted_at', 'is', null)
      .select('id')
      .maybeSingle();

    if (isMissingPageTrashColumn(error)) {
      throw new ServiceUnavailableException(pageTrashUnavailable);
    }
    if (error?.code === '42501' || error?.code === '23503') {
      throw new NotFoundException('The notebook page is no longer available.');
    }
    if (error) {
      throw new ServiceUnavailableException('The page could not be restored.');
    }
    // Also handles an already-restored page. The active lookup verifies the
    // target and returns the preserved bookmark once RLS makes it visible.
    return this.get(user, notebookId, pageId);
  }

  private async getBookmarkIds(
    client: ReturnType<UserDatabaseClientFactory['create']>,
    ownerId: string,
    notebookId: string,
    pageIds: string[],
  ) {
    if (pageIds.length === 0) return new Set<string>();

    const { data, error } = await client
      .from('page_bookmarks')
      .select('notebook_page_id')
      .eq('owner_id', ownerId)
      .eq('notebook_id', notebookId)
      .in('notebook_page_id', pageIds);

    if (error || !data) {
      throw new ServiceUnavailableException(
        'Page bookmarks could not be loaded.',
      );
    }

    return new Set(
      data.flatMap((item) =>
        item.notebook_page_id ? [item.notebook_page_id] : [],
      ),
    );
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
