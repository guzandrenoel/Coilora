import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import { NotebookPagesService } from './notebook-pages.service.js';
import {
  isMissingPageTrashColumn,
  pageTrashUnavailable,
} from './page-trash-schema.js';

const user: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  role: 'authenticated',
  accessToken: 'test-token',
};
const notebookId = '00000000-0000-4000-8000-000000000002';
const pageId = '00000000-0000-4000-8000-000000000003';
const saved = {
  id: pageId,
  notebook_id: notebookId,
  title: 'My notes',
  position: 7,
  paper_style: 'grid',
  document_id: null,
  after_document_page_number: null,
  created_at: '2026-09-01T00:00:00Z',
  updated_at: '2026-09-01T00:00:00Z',
};
const missingColumn = {
  code: '42703',
  message: 'column notebook_pages.deleted_at does not exist',
};
type Result = {
  data: unknown;
  error: { code?: string; message?: string } | null;
};

function setup() {
  const notebook = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn<() => Promise<Result>>()
      .mockResolvedValue({ data: { id: notebookId }, error: null }),
  };
  const page = {
    select: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    not: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn<() => Promise<Result>>()
      .mockResolvedValue({ data: saved, error: null }),
    range: vi
      .fn<() => Promise<Result>>()
      .mockResolvedValue({ data: [saved], error: null }),
  };
  const bookmark = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi
      .fn<() => Promise<Result>>()
      .mockResolvedValue({ data: null, error: null }),
    delete: vi.fn().mockReturnThis(),
    in: vi
      .fn()
      .mockResolvedValue({ data: [{ notebook_page_id: pageId }], error: null }),
  };
  const client = {
    from: vi.fn((table: string) => {
      if (table === 'notebooks') return notebook;
      if (table === 'notebook_pages') return page;
      if (table === 'page_bookmarks') return bookmark;
      throw new Error(`Unexpected table: ${table}`);
    }),
  };
  const factory = { create: vi.fn().mockReturnValue(client) };
  return {
    page,
    bookmark,
    notebook,
    client,
    factory,
    service: new NotebookPagesService(
      factory as unknown as UserDatabaseClientFactory,
    ),
  };
}

describe('notebook page soft deletion', () => {
  it('updates only the timestamp of the active owner-scoped page', async () => {
    const { service, page, notebook, client, factory } = setup();
    const before = Date.now();
    await expect(service.remove(user, notebookId, pageId)).resolves.toEqual({
      id: pageId,
      notebook_id: notebookId,
      deleted: true,
    });
    expect(factory.create).toHaveBeenCalledWith(user);
    expect(notebook.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(notebook.is).toHaveBeenCalledWith('archived_at', null);
    expect(page.update).toHaveBeenCalledExactlyOnceWith({
      deleted_at: expect.any(String),
    });
    expect(
      Date.parse(page.update.mock.calls[0][0].deleted_at),
    ).toBeGreaterThanOrEqual(before);
    expect(page.eq.mock.calls).toEqual([
      ['id', pageId],
      ['notebook_id', notebookId],
      ['owner_id', user.id],
    ]);
    expect(page.is).toHaveBeenCalledWith('deleted_at', null);
    expect(client.from).not.toHaveBeenCalledWith('annotations');
    expect(client.from).not.toHaveBeenCalledWith('page_bookmarks');
    expect(client.from).not.toHaveBeenCalledWith('documents');
  });

  it('acknowledges an already-deleted page after an owner-scoped lookup', async () => {
    const { service, page } = setup();
    page.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { id: pageId, deleted_at: '2026-09-01T01:00:00Z' },
        error: null,
      });
    await expect(
      service.remove(user, notebookId, pageId),
    ).resolves.toMatchObject({ deleted: true });
    expect(page.update).toHaveBeenCalledTimes(1);
    expect(page.select).toHaveBeenLastCalledWith('id, deleted_at');
    expect(page.eq.mock.calls.slice(-3)).toEqual([
      ['id', pageId],
      ['notebook_id', notebookId],
      ['owner_id', user.id],
    ]);
  });

  it('does not report success for missing pages or another owner/notebook', async () => {
    const { service, page } = setup();
    page.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(service.remove(user, notebookId, pageId)).rejects.toThrow(
      NotFoundException,
    );
  });

  it('reports concurrent restoration instead of claiming deletion', async () => {
    const { service, page } = setup();
    page.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: { id: pageId, deleted_at: null },
        error: null,
      });
    await expect(service.remove(user, notebookId, pageId)).rejects.toThrow(
      ConflictException,
    );
  });

  it('does not claim deletion when the verification lookup fails', async () => {
    const { service, page } = setup();
    page.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: { code: '08006' } });
    await expect(service.remove(user, notebookId, pageId)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });

  it('restores by clearing only deleted_at and reloads the saved bookmark', async () => {
    const { service, page, bookmark } = setup();
    await expect(service.restore(user, notebookId, pageId)).resolves.toEqual({
      ...saved,
      bookmarked: true,
    });
    expect(page.update).toHaveBeenCalledExactlyOnceWith({ deleted_at: null });
    expect(page.not).toHaveBeenCalledWith('deleted_at', 'is', null);
    expect(page.eq.mock.calls.slice(0, 3)).toEqual([
      ['id', pageId],
      ['notebook_id', notebookId],
      ['owner_id', user.id],
    ]);
    expect(page.is).toHaveBeenCalledWith('deleted_at', null);
    expect(bookmark.insert).not.toHaveBeenCalled();
    expect(bookmark.delete).not.toHaveBeenCalled();
  });

  it('returns an already-restored page without changing its title or position', async () => {
    const { service, page } = setup();
    page.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(
      service.restore(user, notebookId, pageId),
    ).resolves.toMatchObject(saved);
    expect(page.update).toHaveBeenCalledExactlyOnceWith({ deleted_at: null });
  });

  it('does not restore an inaccessible page', async () => {
    const { service, page } = setup();
    page.maybeSingle.mockResolvedValue({ data: null, error: null });
    await expect(service.restore(user, notebookId, pageId)).rejects.toThrow(
      NotFoundException,
    );
  });

  for (const operation of ['remove', 'restore'] as const) {
    it(`${operation} stops at an inaccessible or archived notebook`, async () => {
      const { service, notebook, page } = setup();
      notebook.maybeSingle.mockResolvedValue({ data: null, error: null });
      await expect(
        service[operation](user, notebookId, pageId),
      ).rejects.toThrow(NotFoundException);
      expect(page.update).not.toHaveBeenCalled();
    });
    it(`${operation} reports an unapplied migration without removing the filter`, async () => {
      const { service, page } = setup();
      page.maybeSingle.mockResolvedValue({ data: null, error: missingColumn });
      await expect(
        service[operation](user, notebookId, pageId),
      ).rejects.toThrow(pageTrashUnavailable);
      expect(page.update).toHaveBeenCalledTimes(1);
    });
    it(`${operation} fails closed on database errors`, async () => {
      const { service, page } = setup();
      page.maybeSingle.mockResolvedValue({
        data: null,
        error: { code: '08006' },
      });
      await expect(
        service[operation](user, notebookId, pageId),
      ).rejects.toThrow(ServiceUnavailableException);
      expect(page.update).toHaveBeenCalledTimes(1);
    });
    it(`${operation} rejects a policy denial`, async () => {
      const { service, page } = setup();
      page.maybeSingle.mockResolvedValue({
        data: null,
        error: { code: '42501' },
      });
      await expect(
        service[operation](user, notebookId, pageId),
      ).rejects.toThrow(NotFoundException);
    });
  }
});

describe('active-page filters and pre-migration compatibility', () => {
  it('filters deleted pages before ordering and pagination', async () => {
    const { service, page } = setup();
    await service.list(user, notebookId, 0);
    expect(page.is).toHaveBeenCalledExactlyOnceWith('deleted_at', null);
    expect(page.is.mock.invocationCallOrder[0]).toBeLessThan(
      page.range.mock.invocationCallOrder[0],
    );
  });
  it('returns not found for a deleted page and does not query its bookmarks', async () => {
    const { service, page, bookmark } = setup();
    page.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(service.get(user, notebookId, pageId)).rejects.toThrow(
      NotFoundException,
    );
    expect(page.is).toHaveBeenCalledWith('deleted_at', null);
    expect(bookmark.in).not.toHaveBeenCalled();
  });
  it('blocks renaming and bookmarking a deleted page', async () => {
    const { service, page, bookmark } = setup();
    page.maybeSingle.mockResolvedValue({ data: null, error: null });
    for (const input of [
      { title: 'Changed' },
      { bookmarked: true },
      { bookmarked: false },
    ]) {
      await expect(
        service.update(user, notebookId, pageId, input),
      ).rejects.toThrow(NotFoundException);
    }
    expect(page.update).not.toHaveBeenCalled();
    expect(bookmark.insert).not.toHaveBeenCalled();
    expect(bookmark.delete).not.toHaveBeenCalled();
  });
  it('checks active status again on the rename write', async () => {
    const { service, page } = setup();
    page.maybeSingle
      .mockResolvedValueOnce({ data: saved, error: null })
      .mockResolvedValueOnce({ data: null, error: null });
    await expect(
      service.update(user, notebookId, pageId, { title: 'Changed' }),
    ).rejects.toThrow(NotFoundException);
    expect(page.is.mock.calls).toEqual([
      ['deleted_at', null],
      ['deleted_at', null],
    ]);
  });
  it('handles a bookmark policy rejection after the page lookup', async () => {
    const { service, bookmark } = setup();
    bookmark.insert.mockResolvedValueOnce({
      data: null,
      error: { code: '42501' },
    });
    await expect(
      service.update(user, notebookId, pageId, { bookmarked: true }),
    ).rejects.toThrow(NotFoundException);
  });
  it('keeps list and get working before the column exists', async () => {
    const { service, page } = setup();
    page.range.mockResolvedValueOnce({ data: null, error: missingColumn });
    await expect(service.list(user, notebookId, 0)).resolves.toMatchObject({
      items: [saved],
    });
    expect(page.range).toHaveBeenCalledTimes(2);
    page.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: missingColumn,
    });
    await expect(service.get(user, notebookId, pageId)).resolves.toMatchObject(
      saved,
    );
    expect(page.maybeSingle).toHaveBeenCalledTimes(2);
  });
  it('keeps existing rename working before the migration', async () => {
    const { service, page } = setup();
    page.maybeSingle
      .mockResolvedValueOnce({ data: null, error: missingColumn })
      .mockResolvedValueOnce({ data: saved, error: null })
      .mockResolvedValueOnce({ data: null, error: missingColumn });
    await expect(
      service.update(user, notebookId, pageId, { title: 'Changed' }),
    ).resolves.toMatchObject({ id: pageId });
    expect(page.update).toHaveBeenCalledTimes(2);
  });
  it.each([
    { code: '42501' },
    { code: '08006' },
    { code: '42703', message: 'column notebook_pages.title does not exist' },
  ])('does not drop read filters for unrelated failures: %j', async (error) => {
    const { service, page } = setup();
    page.range.mockResolvedValueOnce({ data: null, error });
    await expect(service.list(user, notebookId, 0)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(page.range).toHaveBeenCalledTimes(1);
    page.maybeSingle.mockResolvedValueOnce({ data: null, error });
    await expect(service.get(user, notebookId, pageId)).rejects.toThrow(
      ServiceUnavailableException,
    );
    expect(page.maybeSingle).toHaveBeenCalledTimes(1);
  });
  it('only recognizes the known missing page column', () => {
    expect(isMissingPageTrashColumn(missingColumn)).toBe(true);
    expect(
      isMissingPageTrashColumn({
        code: 'PGRST204',
        message:
          "Could not find the 'deleted_at' column of 'notebook_pages' in the schema cache",
      }),
    ).toBe(true);
    expect(isMissingPageTrashColumn(null)).toBe(false);
    expect(
      isMissingPageTrashColumn({
        code: '42501',
        message: missingColumn.message,
      }),
    ).toBe(false);
    expect(
      isMissingPageTrashColumn({
        code: '42703',
        message: 'column documents.deleted_at does not exist',
      }),
    ).toBe(false);
  });
});
