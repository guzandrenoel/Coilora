import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';

@Injectable()
export class DocumentUploadCompletionService {
  constructor(private readonly clients: UserDatabaseClientFactory) {}

  async complete(user: AuthenticatedUser, documentId: string) {
    const client = this.clients.create(user);

    const { data: document, error: documentError } = await client
      .from('documents')
      .select(
        'id, notebook_id, status, source_object_path, byte_size, media_type, revision',
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

    if (
      document.status !== 'awaiting_upload' &&
      document.status !== 'uploaded'
    ) {
      throw new ConflictException(
        'This document cannot complete an upload in its current state.',
      );
    }

    const path = document.source_object_path;
    const prefix =
      `users/${user.id}/documents/${document.id}/source/` +
      `v${document.revision}.`;

    if (
      !path ||
      !path.startsWith(prefix) ||
      !/^(pdf|png|jpg|webp|txt|md)$/.test(path.slice(prefix.length))
    ) {
      throw new ConflictException(
        'The document does not have a valid reserved upload path.',
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

    const { data: file, error: storageError } = await client.storage
      .from('documents')
      .info(path);

    if (storageError) {
      if (
        storageError.status === 404 ||
        storageError.statusCode === '404'
      ) {
        throw new ConflictException(
          'The uploaded file could not be found or accessed.',
        );
      }

      throw new ServiceUnavailableException(
        'Storage could not verify the upload. Please try again.',
      );
    }

    if (
      !file ||
      typeof file.size !== 'number' ||
      typeof file.contentType !== 'string'
    ) {
      throw new ServiceUnavailableException(
        'Storage returned incomplete file details. Please try again.',
      );
    }

    if (
      !Number.isSafeInteger(file.size) ||
      file.size < 1 ||
      file.size > 52428800 ||
      file.size !== document.byte_size
    ) {
      throw new BadRequestException(
        'The uploaded file size does not match the reserved document.',
      );
    }

    const storedMediaType = file.contentType
      .split(';')[0]
      ?.trim()
      .toLowerCase();

    if (storedMediaType !== document.media_type) {
      throw new BadRequestException(
        'The uploaded content type does not match the reserved document.',
      );
    }

    if (document.status === 'uploaded') {
      return {
        id: document.id,
        status: 'uploaded',
        revision: document.revision,
      };
    }

    const { data: updated, error: updateError } = await client
      .from('documents')
      .update({ status: 'uploaded' })
      .eq('id', document.id)
      .eq('owner_id', user.id)
      .eq('notebook_id', document.notebook_id)
      .eq('revision', document.revision)
      .eq('source_object_path', path)
      .eq('byte_size', document.byte_size)
      .eq('media_type', document.media_type)
      .eq('status', 'awaiting_upload')
      .is('deleted_at', null)
      .select('id, status, revision')
      .maybeSingle();

    if (updateError) {
      throw new ServiceUnavailableException(
        'The upload was verified, but its status could not be saved. Please try again.',
      );
    }

    if (!updated) {
      throw new ConflictException(
        'The document changed. Please try completing the upload again.',
      );
    }

    return updated;
  }
}