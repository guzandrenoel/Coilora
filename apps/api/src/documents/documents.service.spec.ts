import {
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import type { CreateDocumentInput } from './documents.schemas.js';
import { DocumentsService } from './documents.service.js';

const user: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  role: 'authenticated',
  accessToken: 'test-access-token',
};

const notebookId = '00000000-0000-4000-8000-000000000002';

const input: CreateDocumentInput = {
  title: 'Anatomy lecture',
  originalFilename: 'anatomy.pdf',
  sourceType: 'pdf',
  mediaType: 'application/pdf',
  byteSize: 1024,
};

const createdDocument = {
  id: '00000000-0000-4000-8000-000000000003',
  status: 'awaiting_upload',
  revision: 1,
};

function setup() {
  const notebookQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: notebookId },
      error: null,
    }),
  };

  const documentQuery = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: createdDocument,
      error: null,
    }),
  };

  const client = {
    from: vi.fn((table: string) => {
      if (table === 'notebooks') {
        return notebookQuery;
      }

      if (table === 'documents') {
        return documentQuery;
      }

      throw new Error(`Unexpected table: ${table}`);
    }),
  };

  const clients = {
    create: vi.fn().mockReturnValue(client),
  };

  const service = new DocumentsService(
    clients as unknown as UserDatabaseClientFactory,
  );

  return { service, clients, client, notebookQuery, documentQuery };
}

describe('DocumentsService', () => {
  it('checks notebook ownership and creates pending metadata', async () => {
    const { service, clients, notebookQuery, documentQuery } = setup();

    await expect(service.create(user, notebookId, input)).resolves.toEqual(
      createdDocument,
    );

    expect(clients.create).toHaveBeenCalledWith(user);
    expect(notebookQuery.eq).toHaveBeenCalledWith('id', notebookId);
    expect(notebookQuery.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(notebookQuery.is).toHaveBeenCalledWith('archived_at', null);

    expect(documentQuery.insert).toHaveBeenCalledWith({
      owner_id: user.id,
      notebook_id: notebookId,
      title: input.title,
      original_filename: input.originalFilename,
      source_type: input.sourceType,
      media_type: input.mediaType,
      byte_size: input.byteSize,
      status: 'awaiting_upload',
    });
  });

  it('does not insert when no accessible active notebook is found', async () => {
    const { service, client, notebookQuery, documentQuery } = setup();

    notebookQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await expect(service.create(user, notebookId, input)).rejects.toThrow(
      NotFoundException,
    );

    expect(client.from).not.toHaveBeenCalledWith('documents');
    expect(documentQuery.insert).not.toHaveBeenCalled();
  });

  it('does not insert when the notebook lookup fails', async () => {
    const { service, notebookQuery, documentQuery } = setup();

    notebookQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '08006' },
    });

    await expect(service.create(user, notebookId, input)).rejects.toThrow(
      ServiceUnavailableException,
    );

    expect(documentQuery.insert).not.toHaveBeenCalled();
  });

  it('handles a notebook removed before the insert', async () => {
    const { service, documentQuery } = setup();

    documentQuery.single.mockResolvedValueOnce({
      data: null,
      error: { code: '23503' },
    });

    await expect(service.create(user, notebookId, input)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('reports an unsuccessful document insert', async () => {
    const { service, documentQuery } = setup();

    documentQuery.single.mockResolvedValueOnce({
      data: null,
      error: { code: '08006' },
    });

    await expect(service.create(user, notebookId, input)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});