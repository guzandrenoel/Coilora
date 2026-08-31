import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import { DocumentUploadsService } from './document-uploads.service.js';

const user: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  role: 'authenticated',
  accessToken: 'test-access-token',
};

const documentId = '00000000-0000-4000-8000-000000000002';
const notebookId = '00000000-0000-4000-8000-000000000003';

const path =
  `users/${user.id}/documents/${documentId}/source/v1.pdf`;

const pendingDocument = {
  id: documentId,
  notebook_id: notebookId,
  status: 'awaiting_upload',
  source_object_path: null,
  media_type: 'application/pdf',
  revision: 1,
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
  const reservationQuery = query({ id: documentId });

  const documentTable = {
    select: vi.fn().mockReturnValue(documentQuery),
    update: vi.fn().mockReturnValue(reservationQuery),
  };

  const signUpload = vi.fn().mockResolvedValue({
    data: { path, token: 'test-upload-token' },
    error: null,
  });

  const storage = {
    from: vi.fn().mockReturnValue({
      createSignedUploadUrl: signUpload,
    }),
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

  const service = new DocumentUploadsService(
    clients as unknown as UserDatabaseClientFactory,
  );

  return {
    service,
    clients,
    documentQuery,
    notebookQuery,
    reservationQuery,
    documentTable,
    storage,
    signUpload,
  };
}

describe('DocumentUploadsService', () => {
  it('checks ownership, reserves the path, and signs without overwrites', async () => {
    const mocks = setup();

    await expect(
      mocks.service.createSession(user, documentId),
    ).resolves.toEqual({
      documentId,
      bucket: 'documents',
      path,
      token: 'test-upload-token',
    });

    expect(mocks.clients.create).toHaveBeenCalledWith(user);

    expect(mocks.documentQuery.eq).toHaveBeenCalledWith(
      'id',
      documentId,
    );
    expect(mocks.documentQuery.eq).toHaveBeenCalledWith(
      'owner_id',
      user.id,
    );
    expect(mocks.documentQuery.is).toHaveBeenCalledWith(
      'deleted_at',
      null,
    );

    expect(mocks.notebookQuery.eq).toHaveBeenCalledWith(
      'id',
      notebookId,
    );
    expect(mocks.notebookQuery.eq).toHaveBeenCalledWith(
      'owner_id',
      user.id,
    );
    expect(mocks.notebookQuery.is).toHaveBeenCalledWith(
      'archived_at',
      null,
    );

    expect(mocks.documentTable.update).toHaveBeenCalledExactlyOnceWith({
      source_object_path: path,
    });

    expect(mocks.reservationQuery.eq).toHaveBeenCalledWith(
      'id',
      documentId,
    );
    expect(mocks.reservationQuery.eq).toHaveBeenCalledWith(
      'owner_id',
      user.id,
    );
    expect(mocks.reservationQuery.eq).toHaveBeenCalledWith(
      'notebook_id',
      notebookId,
    );
    expect(mocks.reservationQuery.eq).toHaveBeenCalledWith(
      'revision',
      1,
    );
    expect(mocks.reservationQuery.eq).toHaveBeenCalledWith(
      'status',
      'awaiting_upload',
    );
    expect(mocks.reservationQuery.is).toHaveBeenCalledWith(
      'deleted_at',
      null,
    );
    expect(mocks.reservationQuery.is).toHaveBeenCalledWith(
      'source_object_path',
      null,
    );

    expect(mocks.storage.from).toHaveBeenCalledWith('documents');
    expect(mocks.signUpload).toHaveBeenCalledExactlyOnceWith(
      path,
      { upsert: false },
    );
  });

  it('reuses an existing matching path when retrying', async () => {
    const mocks = setup();

    mocks.documentQuery.maybeSingle.mockResolvedValueOnce({
      data: { ...pendingDocument, source_object_path: path },
      error: null,
    });

    await expect(
      mocks.service.createSession(user, documentId),
    ).resolves.toMatchObject({ documentId, path });

    expect(mocks.documentTable.update).not.toHaveBeenCalled();
    expect(mocks.signUpload).toHaveBeenCalledWith(
      path,
      { upsert: false },
    );
  });

  it('does not sign when no accessible document is found', async () => {
    const mocks = setup();

    mocks.documentQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await expect(
      mocks.service.createSession(user, documentId),
    ).rejects.toThrow(NotFoundException);

    expect(mocks.documentTable.update).not.toHaveBeenCalled();
    expect(mocks.signUpload).not.toHaveBeenCalled();
  });

  it('does not sign when no accessible active notebook is found', async () => {
    const mocks = setup();

    mocks.notebookQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await expect(
      mocks.service.createSession(user, documentId),
    ).rejects.toThrow(NotFoundException);

    expect(mocks.documentTable.update).not.toHaveBeenCalled();
    expect(mocks.signUpload).not.toHaveBeenCalled();
  });

  it.each(['uploaded', 'ready', 'failed'])(
    'rejects a document with status %s',
    async (status) => {
      const mocks = setup();

      mocks.documentQuery.maybeSingle.mockResolvedValueOnce({
        data: { ...pendingDocument, status },
        error: null,
      });

      await expect(
        mocks.service.createSession(user, documentId),
      ).rejects.toThrow(ConflictException);

      expect(mocks.documentTable.update).not.toHaveBeenCalled();
      expect(mocks.signUpload).not.toHaveBeenCalled();
    },
  );

  it('rejects a different reserved path without changing it', async () => {
    const mocks = setup();

    mocks.documentQuery.maybeSingle.mockResolvedValueOnce({
      data: {
        ...pendingDocument,
        source_object_path: 'unexpected/location.pdf',
      },
      error: null,
    });

    await expect(
      mocks.service.createSession(user, documentId),
    ).rejects.toThrow(ConflictException);

    expect(mocks.documentTable.update).not.toHaveBeenCalled();
    expect(mocks.signUpload).not.toHaveBeenCalled();
  });

  it('rejects unsupported media types', async () => {
    const mocks = setup();

    mocks.documentQuery.maybeSingle.mockResolvedValueOnce({
      data: { ...pendingDocument, media_type: 'video/mp4' },
      error: null,
    });

    await expect(
      mocks.service.createSession(user, documentId),
    ).rejects.toThrow(ConflictException);

    expect(mocks.documentTable.update).not.toHaveBeenCalled();
    expect(mocks.signUpload).not.toHaveBeenCalled();
  });

  it.each([
    'documentQuery',
    'notebookQuery',
    'reservationQuery',
  ] as const)('handles a database failure in %s', async (queryName) => {
    const mocks = setup();

    mocks[queryName].maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { message: 'Database unavailable' },
    });

    await expect(
      mocks.service.createSession(user, documentId),
    ).rejects.toThrow(ServiceUnavailableException);

    expect(mocks.signUpload).not.toHaveBeenCalled();
  });

  it('does not sign when the reservation loses a concurrent update', async () => {
    const mocks = setup();

    mocks.reservationQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await expect(
      mocks.service.createSession(user, documentId),
    ).rejects.toThrow(ConflictException);

    expect(mocks.signUpload).not.toHaveBeenCalled();
  });

  it('reports a storage signing failure', async () => {
    const mocks = setup();

    mocks.signUpload.mockResolvedValueOnce({
      data: null,
      error: { message: 'Storage unavailable' },
    });

    await expect(
      mocks.service.createSession(user, documentId),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});