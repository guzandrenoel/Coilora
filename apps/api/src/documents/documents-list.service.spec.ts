import {
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import { DocumentsService } from './documents.service.js';

const user: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  role: 'authenticated',
  accessToken: 'test-access-token',
};

const notebookId = '00000000-0000-4000-8000-000000000002';

function setup(count = 1) {
  const documents = Array.from({ length: count }, (_, index) => ({
    id: `00000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`,
    notebook_id: notebookId,
    title: `Lecture ${index + 1}`,
    original_filename: `lecture-${index + 1}.pdf`,
    source_type: 'pdf',
    media_type: 'application/pdf',
    status: 'uploaded',
    byte_size: 1024,
    revision: 1,
    created_at: '2026-08-31T00:00:00.000Z',
    updated_at: '2026-08-31T00:00:00.000Z',
  }));

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
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    neq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({
      data: documents,
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

  return {
    service,
    clients,
    client,
    notebookQuery,
    documentQuery,
    documents,
  };
}

describe('DocumentsService.list', () => {
  it('applies ownership, visibility, and ordering filters', async () => {
    const {
      service,
      clients,
      notebookQuery,
      documentQuery,
      documents,
    } = setup();

    await expect(service.list(user, notebookId, 0)).resolves.toEqual({
      items: documents,
      nextPage: null,
    });

    expect(clients.create).toHaveBeenCalledWith(user);
    expect(notebookQuery.eq).toHaveBeenCalledWith('id', notebookId);
    expect(notebookQuery.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(notebookQuery.is).toHaveBeenCalledWith('archived_at', null);

    expect(documentQuery.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(documentQuery.eq).toHaveBeenCalledWith('notebook_id', notebookId);
    expect(documentQuery.is).toHaveBeenCalledWith('deleted_at', null);
    expect(documentQuery.neq).toHaveBeenCalledWith(
      'status',
      'awaiting_upload',
    );

    expect(documentQuery.order).toHaveBeenNthCalledWith(
      1,
      'created_at',
      { ascending: false },
    );
    expect(documentQuery.order).toHaveBeenNthCalledWith(
      2,
      'id',
      { ascending: false },
    );
    expect(documentQuery.range).toHaveBeenCalledWith(0, 20);
  });

  it('returns an empty list when no saved documents exist', async () => {
    const { service } = setup(0);

    await expect(service.list(user, notebookId, 0)).resolves.toEqual({
      items: [],
      nextPage: null,
    });
  });

  it('does not offer another page when exactly 20 documents remain', async () => {
    const { service, documents } = setup(20);

    await expect(service.list(user, notebookId, 0)).resolves.toEqual({
      items: documents,
      nextPage: null,
    });
  });

  it('uses the extra document to detect another page', async () => {
    const { service, documents } = setup(21);

    await expect(service.list(user, notebookId, 0)).resolves.toEqual({
      items: documents.slice(0, 20),
      nextPage: 1,
    });
  });

  it('calculates the offset and next page for later requests', async () => {
    const { service, documents, documentQuery } = setup(21);

    await expect(service.list(user, notebookId, 2)).resolves.toEqual({
      items: documents.slice(0, 20),
      nextPage: 3,
    });

    expect(documentQuery.range).toHaveBeenCalledWith(40, 60);
  });

  it('stops when no accessible active notebook is found', async () => {
    const { service, client, notebookQuery, documentQuery } = setup();

    notebookQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await expect(service.list(user, notebookId, 0)).rejects.toThrow(
      NotFoundException,
    );

    expect(client.from).not.toHaveBeenCalledWith('documents');
    expect(documentQuery.range).not.toHaveBeenCalled();
  });

  it('stops when the notebook lookup fails', async () => {
    const { service, client, notebookQuery, documentQuery } = setup();

    notebookQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '08006' },
    });

    await expect(service.list(user, notebookId, 0)).rejects.toThrow(
      ServiceUnavailableException,
    );

    expect(client.from).not.toHaveBeenCalledWith('documents');
    expect(documentQuery.range).not.toHaveBeenCalled();
  });

  it('reports a failed document query', async () => {
    const { service, documentQuery } = setup();

    documentQuery.range.mockResolvedValueOnce({
      data: null,
      error: { code: '08006' },
    });

    await expect(service.list(user, notebookId, 0)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('does not treat missing query data as an empty library', async () => {
    const { service, documentQuery } = setup();

    documentQuery.range.mockResolvedValueOnce({
      data: null,
      error: null,
    });

    await expect(service.list(user, notebookId, 0)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});