import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import { DocumentUploadCompletionService } from './document-upload-completion.service.js';

const user: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  role: 'authenticated',
  accessToken: 'test-access-token',
};

const documentId = '00000000-0000-4000-8000-000000000002';
const notebookId = '00000000-0000-4000-8000-000000000003';
const path = `users/${user.id}/documents/${documentId}/source/v1.pdf`;

const pendingDocument = {
  id: documentId,
  notebook_id: notebookId,
  status: 'awaiting_upload',
  source_object_path: path,
  byte_size: 1024,
  media_type: 'application/pdf',
  revision: 1,
};

const completedDocument = {
  id: documentId,
  status: 'uploaded',
  revision: 1,
};

const storedFile = {
  size: 1024,
  contentType: 'application/pdf',
};

function query(data: unknown) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
  };
}

function setup() {
  const documentQuery = query({ ...pendingDocument });
  const notebookQuery = query({ id: notebookId });
  const updateQuery = query({ ...completedDocument });

  const documentTable = {
    select: vi.fn().mockReturnValue(documentQuery),
    update: vi.fn().mockReturnValue(updateQuery),
  };

  const info = vi.fn().mockResolvedValue({
    data: { ...storedFile },
    error: null,
  });

  const storage = {
    from: vi.fn().mockReturnValue({ info }),
  };

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'documents') {
        return documentTable;
      }

      if (table === 'notebooks') {
        return notebookQuery;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
    storage,
  };

  const clients = {
    create: vi.fn().mockReturnValue(client),
  };

  const service = new DocumentUploadCompletionService(
    clients as unknown as UserDatabaseClientFactory,
  );

  return {
    service,
    clients,
    documentQuery,
    notebookQuery,
    updateQuery,
    documentTable,
    storage,
    info,
  };
}

describe('DocumentUploadCompletionService', () => {
  it('checks ownership and storage before marking the document uploaded', async () => {
    const mocks = setup();

    await expect(
      mocks.service.complete(user, documentId),
    ).resolves.toEqual(completedDocument);

    expect(mocks.clients.create).toHaveBeenCalledWith(user);
    expect(mocks.documentQuery.eq).toHaveBeenCalledWith('id', documentId);
    expect(mocks.documentQuery.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(mocks.documentQuery.is).toHaveBeenCalledWith('deleted_at', null);

    expect(mocks.notebookQuery.eq).toHaveBeenCalledWith('id', notebookId);
    expect(mocks.notebookQuery.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(mocks.notebookQuery.is).toHaveBeenCalledWith('archived_at', null);

    expect(mocks.storage.from).toHaveBeenCalledWith('documents');
    expect(mocks.info).toHaveBeenCalledExactlyOnceWith(path);

    expect(mocks.documentTable.update).toHaveBeenCalledExactlyOnceWith({
      status: 'uploaded',
    });

    const expectedFilters = {
      id: documentId,
      owner_id: user.id,
      notebook_id: notebookId,
      revision: 1,
      source_object_path: path,
      byte_size: 1024,
      media_type: 'application/pdf',
      status: 'awaiting_upload',
    };

    for (const [column, value] of Object.entries(expectedFilters)) {
      expect(mocks.updateQuery.eq).toHaveBeenCalledWith(column, value);
    }

    expect(mocks.updateQuery.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('rechecks storage without rewriting an already completed upload', async () => {
    const mocks = setup();

    mocks.documentQuery.maybeSingle.mockResolvedValueOnce({
      data: { ...pendingDocument, status: 'uploaded' },
      error: null,
    });

    await expect(
      mocks.service.complete(user, documentId),
    ).resolves.toEqual(completedDocument);

    expect(mocks.info).toHaveBeenCalledExactlyOnceWith(path);
    expect(mocks.documentTable.update).not.toHaveBeenCalled();
  });

  it('normalizes content-type casing and parameters', async () => {
    const mocks = setup();

    mocks.info.mockResolvedValueOnce({
      data: {
        ...storedFile,
        contentType: 'Application/PDF; charset=utf-8',
      },
      error: null,
    });

    await expect(
      mocks.service.complete(user, documentId),
    ).resolves.toEqual(completedDocument);
  });

  it.each(['documentQuery', 'notebookQuery'] as const)(
    'rejects an inaccessible record from %s',
    async (queryName) => {
      const mocks = setup();

      mocks[queryName].maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      });

      await expect(
        mocks.service.complete(user, documentId),
      ).rejects.toThrow(NotFoundException);

      expect(mocks.info).not.toHaveBeenCalled();
      expect(mocks.documentTable.update).not.toHaveBeenCalled();
    },
  );

  it.each([
    null,
    'unexpected/location.pdf',
    path.replace('v1.pdf', 'v2.pdf'),
    `${path}/extra`,
  ])('rejects an invalid reserved path: %s', async (invalidPath) => {
    const mocks = setup();

    mocks.documentQuery.maybeSingle.mockResolvedValueOnce({
      data: { ...pendingDocument, source_object_path: invalidPath },
      error: null,
    });

    await expect(
      mocks.service.complete(user, documentId),
    ).rejects.toThrow(ConflictException);

    expect(mocks.info).not.toHaveBeenCalled();
    expect(mocks.documentTable.update).not.toHaveBeenCalled();
  });

  it.each(['ready', 'failed', 'validating'])(
    'does not reset a document with status %s',
    async (status) => {
      const mocks = setup();

      mocks.documentQuery.maybeSingle.mockResolvedValueOnce({
        data: { ...pendingDocument, status },
        error: null,
      });

      await expect(
        mocks.service.complete(user, documentId),
      ).rejects.toThrow(ConflictException);

      expect(mocks.info).not.toHaveBeenCalled();
      expect(mocks.documentTable.update).not.toHaveBeenCalled();
    },
  );

  it.each([0, 1000, 1024.5, 52428801])(
    'rejects an invalid or mismatched file size: %s',
    async (size) => {
      const mocks = setup();

      mocks.info.mockResolvedValueOnce({
        data: { ...storedFile, size },
        error: null,
      });

      await expect(
        mocks.service.complete(user, documentId),
      ).rejects.toThrow(BadRequestException);

      expect(mocks.documentTable.update).not.toHaveBeenCalled();
    },
  );

  it('rejects a mismatched content type', async () => {
    const mocks = setup();

    mocks.info.mockResolvedValueOnce({
      data: { ...storedFile, contentType: 'image/png' },
      error: null,
    });

    await expect(
      mocks.service.complete(user, documentId),
    ).rejects.toThrow(BadRequestException);

    expect(mocks.documentTable.update).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'missing file details', data: null },
    { label: 'missing size', data: { contentType: 'application/pdf' } },
    { label: 'missing content type', data: { size: 1024 } },
  ])('rejects $label', async ({ data }) => {
    const mocks = setup();

    mocks.info.mockResolvedValueOnce({ data, error: null });

    await expect(
      mocks.service.complete(user, documentId),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(mocks.documentTable.update).not.toHaveBeenCalled();
  });

  it.each([
    { status: 404 },
    { statusCode: '404' },
  ])('handles a missing storage object: %j', async (error) => {
    const mocks = setup();

    mocks.info.mockResolvedValueOnce({ data: null, error });

    await expect(
      mocks.service.complete(user, documentId),
    ).rejects.toThrow(ConflictException);

    expect(mocks.documentTable.update).not.toHaveBeenCalled();
  });

  it('does not mark the document uploaded during a storage outage', async () => {
    const mocks = setup();

    mocks.info.mockResolvedValueOnce({
      data: null,
      error: { status: 503 },
    });

    await expect(
      mocks.service.complete(user, documentId),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(mocks.documentTable.update).not.toHaveBeenCalled();
  });

  it.each([
    'documentQuery',
    'notebookQuery',
    'updateQuery',
  ] as const)('reports database failures in %s', async (queryName) => {
    const mocks = setup();

    mocks[queryName].maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database unavailable' },
    });

    await expect(
      mocks.service.complete(user, documentId),
    ).rejects.toThrow(ServiceUnavailableException);

    if (queryName !== 'updateQuery') {
      expect(mocks.info).not.toHaveBeenCalled();
      expect(mocks.documentTable.update).not.toHaveBeenCalled();
    }
  });

  it('reports a concurrent document change during completion', async () => {
    const mocks = setup();

    mocks.updateQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await expect(
      mocks.service.complete(user, documentId),
    ).rejects.toThrow(ConflictException);
  });
});