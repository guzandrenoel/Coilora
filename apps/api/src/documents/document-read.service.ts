import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';

const readUrlLifetimeSeconds = 300;

@Injectable()
export class DocumentReadService {
  constructor(private readonly clients: UserDatabaseClientFactory) {}

  async createSession(user: AuthenticatedUser, documentId: string) {
    const client = this.clients.create(user);

    const { data: document, error: documentError } = await client
      .from('documents')
      .select(
        'id, notebook_id, title, original_filename, source_type, media_type, status, source_object_path, revision, byte_size, page_count',
      )
      .eq('id', documentId)
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

    if (!notebook) {
      throw new NotFoundException('The notebook was not found.');
    }

    if (
      document.source_type !== 'pdf' ||
      document.media_type !== 'application/pdf'
    ) {
      throw new ConflictException(
        'The document reader currently supports PDF files only.',
      );
    }

    // Other processing states need their own validated reading path.
    if (document.status !== 'uploaded') {
      throw new ConflictException(
        'This document cannot be opened in its current state.',
      );
    }

    if (!Number.isSafeInteger(document.revision) || document.revision < 1) {
      throw new ConflictException('The document has an invalid file revision.');
    }

    const expectedPath =
      `users/${user.id}/documents/${document.id}/source/` +
      `v${document.revision}.pdf`;

    if (document.source_object_path !== expectedPath) {
      throw new ConflictException(
        'The document does not have a valid stored PDF path.',
      );
    }

    const { data: access, error: accessError } = await client.storage
      .from('documents')
      .createSignedUrl(expectedPath, readUrlLifetimeSeconds);

    if (accessError || !access?.signedUrl) {
      throw new ServiceUnavailableException(
        'The PDF could not be opened. Please try again.',
      );
    }

    return {
      documentId: document.id,
      notebookId: document.notebook_id,
      title: document.title,
      originalFilename: document.original_filename,
      mediaType: document.media_type,
      byteSize: document.byte_size,
      pageCount: document.page_count,
      revision: document.revision,
      status: document.status,
      signedUrl: access.signedUrl,
      expiresIn: readUrlLifetimeSeconds,
    };
  }

  async recordPageCount(
    user: AuthenticatedUser,
    documentId: string,
    pageCount: number,
  ) {
    const client = this.clients.create(user);
    const { data, error } = await client
      .from('documents')
      .update({ page_count: pageCount })
      .eq('id', documentId)
      .eq('owner_id', user.id)
      .eq('source_type', 'pdf')
      .is('deleted_at', null)
      .select('id, notebook_id, page_count')
      .maybeSingle();

    if (error) {
      throw new ServiceUnavailableException(
        'The PDF page count could not be saved.',
      );
    }
    if (!data) throw new NotFoundException('The document was not found.');
    return data;
  }
}
