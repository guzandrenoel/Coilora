import {
  BadRequestException,
  ConflictException,
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
const destinationNotebookId = '00000000-0000-4000-8000-000000000004';

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
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: createdDocument.id, bookmarked: true },
      error: null,
    }),
    single: vi.fn().mockResolvedValue({
      data: createdDocument,
      error: null,
    }),
  };

  const client = {
    rpc: vi.fn().mockResolvedValue({
      data: {
        ...createdDocument,
        notebook_id: destinationNotebookId,
      },
      error: null,
    }),
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
  it('moves a document through the authenticated transactional RPC', async () => {
    const { service, clients, client } = setup();

    await expect(
      service.move(user, notebookId, createdDocument.id, destinationNotebookId),
    ).resolves.toMatchObject({
      id: createdDocument.id,
      notebook_id: destinationNotebookId,
    });

    expect(clients.create).toHaveBeenCalledWith(user);
    expect(client.rpc).toHaveBeenCalledExactlyOnceWith(
      'move_document_to_notebook',
      {
        p_source_notebook_id: notebookId,
        p_document_id: createdDocument.id,
        p_destination_notebook_id: destinationNotebookId,
      },
    );
  });

  it.each([
    {
      caseName: 'an inaccessible source document',
      code: 'P0002',
      exception: NotFoundException,
    },
    {
      caseName: 'an unavailable or archived destination notebook',
      code: '23503',
      exception: BadRequestException,
    },
    {
      caseName: 'a concurrent move',
      code: '40001',
      exception: ConflictException,
    },
    {
      caseName: 'a database failure',
      code: '08006',
      exception: ServiceUnavailableException,
    },
  ])('maps $caseName safely', async ({ code, exception }) => {
    const { service, client } = setup();
    client.rpc.mockResolvedValueOnce({ data: null, error: { code } });

    await expect(
      service.move(user, notebookId, createdDocument.id, destinationNotebookId),
    ).rejects.toThrow(exception);
  });

  it('rejects an unexpected document move response', async () => {
    const { service, client } = setup();
    client.rpc.mockResolvedValueOnce({
      data: { id: createdDocument.id, notebook_id: notebookId },
      error: null,
    });

    await expect(
      service.move(user, notebookId, createdDocument.id, destinationNotebookId),
    ).rejects.toThrow(ServiceUnavailableException);
  });

  it('updates a whole-document bookmark within an owned active notebook', async () => {
    const { service, notebookQuery, documentQuery } = setup();
    await expect(
      service.setBookmark(user, notebookId, createdDocument.id, true),
    ).resolves.toEqual({ id: createdDocument.id, bookmarked: true });
    expect(notebookQuery.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(notebookQuery.is).toHaveBeenCalledWith('archived_at', null);
    expect(documentQuery.update).toHaveBeenCalledWith({ bookmarked: true });
    expect(documentQuery.eq).toHaveBeenCalledWith('id', createdDocument.id);
    expect(documentQuery.eq).toHaveBeenCalledWith('notebook_id', notebookId);
    expect(documentQuery.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(documentQuery.is).toHaveBeenCalledWith('deleted_at', null);
    expect(documentQuery.neq).toHaveBeenCalledWith('status', 'awaiting_upload');
  });

  it('can remove a whole-document bookmark', async () => {
    const { service, documentQuery } = setup();
    documentQuery.maybeSingle.mockResolvedValueOnce({
      data: { id: createdDocument.id, bookmarked: false },
      error: null,
    });
    await expect(
      service.setBookmark(user, notebookId, createdDocument.id, false),
    ).resolves.toEqual({ id: createdDocument.id, bookmarked: false });
    expect(documentQuery.update).toHaveBeenCalledWith({ bookmarked: false });
  });

  it('cannot bookmark in an inaccessible or archived notebook', async () => {
    const { service, notebookQuery, documentQuery } = setup();
    notebookQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    await expect(
      service.setBookmark(user, notebookId, createdDocument.id, true),
    ).rejects.toThrow(NotFoundException);
    expect(documentQuery.update).not.toHaveBeenCalled();
  });

  it('reports a missing or inaccessible document bookmark target', async () => {
    const { service, documentQuery } = setup();
    documentQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    await expect(
      service.setBookmark(user, notebookId, createdDocument.id, true),
    ).rejects.toThrow(NotFoundException);
  });

  it('reports bookmark storage failure without claiming it was saved', async () => {
    const { service, documentQuery } = setup();
    documentQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '08006' },
    });
    await expect(
      service.setBookmark(user, notebookId, createdDocument.id, true),
    ).rejects.toThrow(ServiceUnavailableException);
  });

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
