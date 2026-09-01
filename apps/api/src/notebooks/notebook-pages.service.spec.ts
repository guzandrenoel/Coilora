import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import { NotebookPagesService } from './notebook-pages.service.js';

const user: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  role: 'authenticated',
  accessToken: 'test-access-token',
};
const notebookId = '00000000-0000-4000-8000-000000000002';
const savedPage = {
  id: '00000000-0000-4000-8000-000000000003',
  notebook_id: notebookId,
  position: 1,
  paper_style: 'ruled',
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
};

function setup(pageRows = [savedPage]) {
  const notebookQuery = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: { id: notebookId },
      error: null,
    }),
  };
  const pageQuery = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue({ data: pageRows, error: null }),
    single: vi.fn().mockResolvedValue({ data: savedPage, error: null }),
  };
  const client = {
    from: vi.fn((table: string) =>
      table === 'notebooks' ? notebookQuery : pageQuery,
    ),
  };
  const clients = { create: vi.fn().mockReturnValue(client) };
  return {
    service: new NotebookPagesService(
      clients as unknown as UserDatabaseClientFactory,
    ),
    clients,
    client,
    notebookQuery,
    pageQuery,
  };
}

describe('NotebookPagesService', () => {
  it('lists only the owner notebook pages in saved order', async () => {
    const { service, notebookQuery, pageQuery } = setup();
    await expect(service.list(user, notebookId, 0)).resolves.toEqual({
      items: [savedPage],
      nextPage: null,
    });
    expect(notebookQuery.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(notebookQuery.is).toHaveBeenCalledWith('archived_at', null);
    expect(pageQuery.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(pageQuery.eq).toHaveBeenCalledWith('notebook_id', notebookId);
    expect(pageQuery.order).toHaveBeenCalledWith('position', {
      ascending: true,
    });
    expect(pageQuery.range).toHaveBeenCalledWith(0, 50);
  });

  it('uses one extra row to expose the next page', async () => {
    const rows = Array.from({ length: 51 }, (_, index) => ({
      ...savedPage,
      id: `00000000-0000-4000-8000-${String(index + 10).padStart(12, '0')}`,
      position: index + 1,
    }));
    const { service } = setup(rows);
    await expect(service.list(user, notebookId, 2)).resolves.toEqual({
      items: rows.slice(0, 50),
      nextPage: 3,
    });
  });

  it('creates a blank page for the authenticated owner', async () => {
    const { service, pageQuery } = setup();
    await expect(
      service.create(user, notebookId, { paperStyle: 'ruled' }),
    ).resolves.toEqual(savedPage);
    expect(pageQuery.insert).toHaveBeenCalledWith({
      owner_id: user.id,
      notebook_id: notebookId,
      paper_style: 'ruled',
    });
  });

  it('does not query pages when the active notebook is unavailable', async () => {
    const { service, client, notebookQuery } = setup();
    notebookQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: null,
    });
    await expect(service.list(user, notebookId, 0)).rejects.toThrow(
      NotFoundException,
    );
    expect(client.from).not.toHaveBeenCalledWith('notebook_pages');
  });

  it('reports notebook lookup failures', async () => {
    const { service, notebookQuery } = setup();
    notebookQuery.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '08006' },
    });
    await expect(service.list(user, notebookId, 0)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('reports page query failures without treating them as empty', async () => {
    const { service, pageQuery } = setup();
    pageQuery.range.mockResolvedValueOnce({ data: null, error: null });
    await expect(service.list(user, notebookId, 0)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
