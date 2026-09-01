import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import { DocumentReadService } from './document-read.service.js';

const user: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  role: 'authenticated',
  accessToken: 'test-access-token',
};

const notebookId = '00000000-0000-4000-8000-000000000002';
const documentId = '00000000-0000-4000-8000-000000000003';
const otherId = '00000000-0000-4000-8000-000000000004';

const expectedPath =
  `users/${user.id}/documents/${documentId}/source/v1.pdf`;

const signedUrl =
  'https://storage.example.invalid/test.pdf?token=test-token';

function setup() {
  const document = {
    id: documentId,
    notebook_id: notebookId,
    title: 'Anatomy lecture',
    original_filename: 'anatomy.pdf',
    source_type: 'pdf',
    media_type: 'application/pdf',
    status: 'uploaded',
    source_object_path: expectedPath,
    revision: 1,
    byte_size: 1024,
  };

  const documentQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: document,
      error: null,
    }),
  };

  const notebookQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: notebookId },
      error: null,
    }),
  };

  const bucket = {
    createSignedUrl: vi.fn().mockResolvedValue({
      data: { signedUrl },
      error: null,
    }),
  };

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'documents') {
        return documentQuery;
      }

      if (table === 'notebooks') {
        return notebookQuery;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
    storage: {
      from: vi.fn().mockReturnValue(bucket),
    },
  };

  const clients = {
    create: vi.fn().mockReturnValue(client),
  };

  const service = new DocumentReadService(
    clients as unknown as UserDatabaseClientFactory,
  );

  return {
    service,
    clients,
    client,
    document,
    documentQuery,
    notebookQuery,
    bucket,
  };
}

describe('DocumentReadService', () => {
  it('checks ownership and signs the canonical PDF path for five minutes', async () => {
    const {
      service,
      clients,
      client,
      document,
      documentQuery,
      notebookQuery,
      bucket,
    } = setup();

    await expect(
      service.createSession(user, documentId),
    ).resolves.toEqual({
      documentId,
      notebookId,
      title: document.title,
      originalFilename: document.original_filename,
      mediaType: document.media_type,
      byteSize: document.byte_size,
      revision: 1,
      status: 'uploaded',
      signedUrl,
      expiresIn: 300,
    });

    expect(clients.create).toHaveBeenCalledWith(user);
    expect(documentQuery.eq).toHaveBeenCalledWith('id', documentId);
    expect(documentQuery.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(documentQuery.is).toHaveBeenCalledWith('deleted_at', null);

    expect(notebookQuery.eq).toHaveBeenCalledWith('id', notebookId);
    expect(notebookQuery.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(notebookQuery.is).toHaveBeenCalledWith('archived_at', null);

    expect(client.storage.from).toHaveBeenCalledWith('documents');
    expect(bucket.createSignedUrl).toHaveBeenCalledExactlyOnceWith(
      expectedPath,
      300,
    );
  });

  it.each(['documents', 'notebooks'])(
    'does not sign when the %s lookup finds no accessible record',
    async (table) => {
      const {
        service,
        client,
        documentQuery,
        notebookQuery,
        bucket,
      } = setup();

      const query =
        table === 'documents' ? documentQuery : notebookQuery;

      query.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        service.createSession(user, documentId),
      ).rejects.toThrow(NotFoundException);

      expect(client.storage.from).not.toHaveBeenCalled();
      expect(bucket.createSignedUrl).not.toHaveBeenCalled();
    },
  );

  it.each(['documents', 'notebooks'])(
    'does not sign when the %s lookup fails',
    async (table) => {
      const {
        service,
        client,
        documentQuery,
        notebookQuery,
        bucket,
      } = setup();

      const query =
        table === 'documents' ? documentQuery : notebookQuery;

      query.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { code: '08006' },
      });

      await expect(
        service.createSession(user, documentId),
      ).rejects.toThrow(ServiceUnavailableException);

      expect(client.storage.from).not.toHaveBeenCalled();
      expect(bucket.createSignedUrl).not.toHaveBeenCalled();
    },
  );

  it.each([
    { source_type: 'image', media_type: 'application/pdf' },
    { source_type: 'pdf', media_type: 'image/png' },
  ])('rejects mismatched PDF metadata: %j', async (changes) => {
    const { service, document, documentQuery, bucket } = setup();

    documentQuery.maybeSingle.mockResolvedValueOnce({
      data: { ...document, ...changes },
      error: null,
    });

    await expect(
      service.createSession(user, documentId),
    ).rejects.toThrow(ConflictException);

    expect(bucket.createSignedUrl).not.toHaveBeenCalled();
  });

  it.each([
    'awaiting_upload',
    'validating',
    'quarantined',
    'extracting',
    'ocr_required',
    'indexing',
    'ready',
    'failed',
  ])('rejects the currently unsupported state: %s', async (status) => {
    const { service, document, documentQuery, bucket } = setup();

    documentQuery.maybeSingle.mockResolvedValueOnce({
      data: { ...document, status },
      error: null,
    });

    await expect(
      service.createSession(user, documentId),
    ).rejects.toThrow(ConflictException);

    expect(bucket.createSignedUrl).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5])(
    'rejects an invalid revision: %s',
    async (revision) => {
      const { service, document, documentQuery, bucket } = setup();

      documentQuery.maybeSingle.mockResolvedValueOnce({
        data: { ...document, revision },
        error: null,
      });

      await expect(
        service.createSession(user, documentId),
      ).rejects.toThrow(ConflictException);

      expect(bucket.createSignedUrl).not.toHaveBeenCalled();
    },
  );

  it.each([
    null,
    expectedPath.replace(user.id, otherId),
    expectedPath.replace(documentId, otherId),
    expectedPath.replace('v1.pdf', 'v2.pdf'),
  ])('rejects a missing or mismatched storage path: %s', async (path) => {
    const { service, document, documentQuery, bucket } = setup();

    documentQuery.maybeSingle.mockResolvedValueOnce({
      data: { ...document, source_object_path: path },
      error: null,
    });

    await expect(
      service.createSession(user, documentId),
    ).rejects.toThrow(ConflictException);

    expect(bucket.createSignedUrl).not.toHaveBeenCalled();
  });

  it.each([
    { data: null, error: { message: 'Storage failure' } },
    { data: null, error: null },
    { data: { signedUrl: '' }, error: null },
  ])('handles an unsuccessful signing response: %j', async (response) => {
    const { service, bucket } = setup();

    bucket.createSignedUrl.mockResolvedValueOnce(response);

    await expect(
      service.createSession(user, documentId),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});