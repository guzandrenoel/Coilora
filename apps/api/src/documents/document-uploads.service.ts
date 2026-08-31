import {
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';

const bucketName = 'documents';

const extensions = new Map([
  ['application/pdf', 'pdf'],
  ['image/png', 'png'],
  ['image/jpeg', 'jpg'],
  ['image/webp', 'webp'],
  ['text/plain', 'txt'],
  ['text/markdown', 'md'],
  ['text/x-markdown', 'md'],
]);

@Injectable()
export class DocumentUploadsService {
  constructor(private readonly clients: UserDatabaseClientFactory) {}

  async createSession(user: AuthenticatedUser, documentId: string) {
    const client = this.clients.create(user);

    const { data: document, error: documentError } = await client
      .from('documents')
      .select(
        'id, notebook_id, status, source_object_path, media_type, revision',
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

    if (document.status !== 'awaiting_upload') {
      throw new ConflictException(
        'This document is no longer awaiting an upload.',
      );
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

    const extension = extensions.get(document.media_type);

    if (!extension) {
      throw new ConflictException(
        'This document has an unsupported file type.',
      );
    }

    const path =
      `users/${user.id}/documents/${document.id}/source/` +
      `v${document.revision}.${extension}`;

    if (
      document.source_object_path !== null &&
      document.source_object_path !== path
    ) {
      throw new ConflictException(
        'The document has a different reserved upload path.',
      );
    }

    if (document.source_object_path === null) {
      const { data: reserved, error: reservationError } = await client
        .from('documents')
        .update({ source_object_path: path })
        .eq('id', document.id)
        .eq('owner_id', user.id)
        .eq('notebook_id', document.notebook_id)
        .eq('revision', document.revision)
        .eq('status', 'awaiting_upload')
        .is('deleted_at', null)
        .is('source_object_path', null)
        .select('id')
        .maybeSingle();

      if (reservationError) {
        throw new ServiceUnavailableException(
          'The upload path could not be reserved.',
        );
      }

      if (!reserved) {
        throw new ConflictException(
          'The document changed. Please try the upload again.',
        );
      }
    }

    const { data: upload, error: uploadError } = await client.storage
      .from(bucketName)
      .createSignedUploadUrl(path, { upsert: false });

    if (uploadError || !upload) {
      throw new ServiceUnavailableException(
        'The upload session could not be created. Please try again.',
      );
    }

    return {
      documentId: document.id,
      bucket: bucketName,
      path: upload.path,
      token: upload.token,
    };
  }
}