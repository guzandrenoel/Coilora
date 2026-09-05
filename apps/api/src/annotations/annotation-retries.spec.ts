import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import type { NotebookPagesService } from '../notebooks/notebook-pages.service.js';
import type { CreateAnnotationInput } from './annotations.schemas.js';
import { NotebookPageAnnotationsService } from './notebook-page-annotations.service.js';
import { DocumentPageAnnotationsService } from './document-page-annotations.service.js';

const user: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  role: 'authenticated',
  accessToken: 'test-access-token',
};
const notebookId = '00000000-0000-4000-8000-000000000002';
const pageId = '00000000-0000-4000-8000-000000000003';
const documentId = '00000000-0000-4000-8000-000000000004';
const input: CreateAnnotationInput = {
  id: '00000000-0000-4000-8000-000000000005',
  kind: 'ink',
  color: '#173f5f',
  width: 0.004,
  opacity: 1,
  points: [
    { x: 0, y: 0 },
    { x: 1, y: 1 },
  ],
};

function setup() {
  const annotation = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { code: '23505' } }),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: { ...input, revision: 1 }, error: null }),
  };
  const document = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        id: documentId,
        notebook_id: notebookId,
        source_type: 'pdf',
        status: 'uploaded',
        page_count: 20,
      },
      error: null,
    }),
  };
  const notebook = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi
      .fn()
      .mockResolvedValue({ data: { id: notebookId }, error: null }),
  };
  const bookmarks = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    gt: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue({ data: [], error: null }),
  };
  const client = {
    from: vi.fn((table: string) =>
      table === 'documents'
        ? document
        : table === 'page_bookmarks'
          ? bookmarks
          : table === 'notebooks'
            ? notebook
            : annotation,
    ),
  };
  const clients = { create: vi.fn().mockReturnValue(client) };
  const pages = { get: vi.fn().mockResolvedValue({ id: pageId }) };
  return {
    annotation,
    bookmarks,
    document,
    notebook,
    pages,
    client,
    notes: new NotebookPageAnnotationsService(
      clients as unknown as UserDatabaseClientFactory,
      pages as unknown as NotebookPagesService,
    ),
    pdf: new DocumentPageAnnotationsService(
      clients as unknown as UserDatabaseClientFactory,
    ),
  };
}

describe('annotation save retries', () => {
  it('blocks annotation reads, saves and erasing when the notebook page is trashed', async () => {
    const { notes, pages, client } = setup();
    pages.get.mockRejectedValue(
      new NotFoundException('The notebook page was not found.'),
    );
    await expect(notes.list(user, notebookId, pageId, 0)).rejects.toThrow(
      NotFoundException,
    );
    await expect(notes.create(user, notebookId, pageId, input)).rejects.toThrow(
      NotFoundException,
    );
    await expect(
      notes.remove(user, notebookId, pageId, input.id!),
    ).rejects.toThrow(NotFoundException);
    expect(client.from).not.toHaveBeenCalled();
  });
  it('returns the saved notebook stroke only after checking the page and owner', async () => {
    const { notes, annotation, pages } = setup();
    await expect(
      notes.create(user, notebookId, pageId, input),
    ).resolves.toEqual({ ...input, revision: 1 });
    expect(pages.get).toHaveBeenCalledWith(user, notebookId, pageId);
    expect(annotation.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: input.id,
        owner_id: user.id,
        notebook_page_id: pageId,
      }),
    );
    expect(annotation.eq).toHaveBeenCalledWith('id', input.id);
    expect(annotation.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(annotation.eq).toHaveBeenCalledWith('notebook_page_id', pageId);
    expect(annotation.is).toHaveBeenCalledWith('document_id', null);
  });
  it('maps text fields into the stored annotation columns', async () => {
    const { notes, annotation } = setup();
    const textInput: CreateAnnotationInput = {
      ...input,
      kind: 'text',
      text: 'Key finding',
      fontSize: 0.025,
    };
    annotation.single.mockResolvedValueOnce({
      data: {
        ...textInput,
        text_content: textInput.text,
        font_size: textInput.fontSize,
      },
      error: null,
    });

    await notes.create(user, notebookId, pageId, textInput);

    expect(annotation.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'text',
        text_content: 'Key finding',
        font_size: 0.025,
      }),
    );
  });
  it('does not expose a UUID collision outside the notebook page', async () => {
    const { notes, annotation } = setup();
    annotation.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(notes.create(user, notebookId, pageId, input)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
  it('returns a PDF retry only for the exact document, page and owner', async () => {
    const { pdf, annotation, document, notebook } = setup();
    await expect(pdf.create(user, documentId, 7, input)).resolves.toEqual({
      ...input,
      revision: 1,
    });
    expect(document.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(notebook.is).toHaveBeenCalledWith('archived_at', null);
    expect(annotation.eq).toHaveBeenCalledWith('id', input.id);
    expect(annotation.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(annotation.eq).toHaveBeenCalledWith('document_id', documentId);
    expect(annotation.eq).toHaveBeenCalledWith('document_page_number', 7);
    expect(annotation.is).toHaveBeenCalledWith('notebook_page_id', null);
  });
  it('rejects missing and failed retry lookups without claiming a save succeeded', async () => {
    const { pdf, annotation } = setup();
    annotation.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(pdf.create(user, documentId, 7, input)).rejects.toThrow(
      ServiceUnavailableException,
    );
    annotation.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '08006' },
    });
    await expect(pdf.create(user, documentId, 7, input)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
  it('does not look for retries when the document is unavailable', async () => {
    const { pdf, annotation, document } = setup();
    document.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await expect(pdf.create(user, documentId, 7, input)).rejects.toThrow(
      NotFoundException,
    );
    expect(annotation.insert).not.toHaveBeenCalled();
    expect(annotation.maybeSingle).not.toHaveBeenCalled();
  });
  it('continues to support clients without a retry ID', async () => {
    const { notes, annotation } = setup();
    const legacy = { ...input };
    delete legacy.id;
    annotation.single.mockResolvedValueOnce({
      data: { ...input },
      error: null,
    });
    await notes.create(user, notebookId, pageId, legacy);
    expect(annotation.insert.mock.calls[0][0]).not.toHaveProperty('id');
    expect(annotation.maybeSingle).not.toHaveBeenCalled();
  });
});

describe('long PDF bookmark lists', () => {
  it('returns bookmarks beyond one database batch', async () => {
    const { pdf, bookmarks } = setup();
    for (const start of [1, 501])
      bookmarks.limit.mockResolvedValueOnce({
        data: Array.from({ length: 500 }, (_, index) => ({
          document_page_number: start + index,
        })),
        error: null,
      });
    bookmarks.limit.mockResolvedValueOnce({
      data: [{ document_page_number: 4000 }],
      error: null,
    });
    const result = await pdf.listBookmarks(user, documentId);
    expect(result.pages).toHaveLength(1001);
    expect(result.pages[1000]).toBe(4000);
    expect(bookmarks.gt.mock.calls).toEqual([
      ['document_page_number', 0],
      ['document_page_number', 500],
      ['document_page_number', 1000],
    ]);
    expect(bookmarks.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(bookmarks.eq).toHaveBeenCalledWith('document_id', documentId);
  });
  it('does not return a partial success when a later batch fails', async () => {
    const { pdf, bookmarks } = setup();
    bookmarks.limit.mockResolvedValueOnce({
      data: Array.from({ length: 500 }, (_, index) => ({
        document_page_number: index + 1,
      })),
      error: null,
    });
    bookmarks.limit.mockResolvedValueOnce({
      data: null,
      error: { code: '08006' },
    });
    await expect(pdf.listBookmarks(user, documentId)).rejects.toThrow(
      ServiceUnavailableException,
    );
  });
});
