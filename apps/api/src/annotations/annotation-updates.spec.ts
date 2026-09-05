import {
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import type { AuthenticatedUser } from '../auth/auth.types.js';
import type { UserDatabaseClientFactory } from '../database/user-database-client.factory.js';
import type { NotebookPagesService } from '../notebooks/notebook-pages.service.js';
import type { UpdateAnnotationInput } from './annotations.schemas.js';
import { DocumentPageAnnotationsService } from './document-page-annotations.service.js';
import { NotebookPageAnnotationsService } from './notebook-page-annotations.service.js';

const user: AuthenticatedUser = {
  id: '00000000-0000-4000-8000-000000000001',
  role: 'authenticated',
  accessToken: 'test-access-token',
};
const notebookId = '00000000-0000-4000-8000-000000000002';
const pageId = '00000000-0000-4000-8000-000000000003';
const documentId = '00000000-0000-4000-8000-000000000004';
const annotationId = '00000000-0000-4000-8000-000000000005';
const input: UpdateAnnotationInput = {
  points: [
    { x: 0.2, y: 0.25 },
    { x: 0.7, y: 0.75 },
  ],
  revision: 3,
};

function setup() {
  const annotation = {
    update: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    maybeSingle: vi.fn().mockResolvedValue({
      data: {
        id: annotationId,
        points: input.points,
        revision: input.revision + 1,
      },
      error: null,
    }),
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
  const client = {
    from: vi.fn((table: string) =>
      table === 'documents'
        ? document
        : table === 'notebooks'
          ? notebook
          : annotation,
    ),
  };
  const clients = { create: vi.fn().mockReturnValue(client) };
  const pages = { get: vi.fn().mockResolvedValue({ id: pageId }) };

  return {
    annotation,
    client,
    document,
    notebook,
    pages,
    notes: new NotebookPageAnnotationsService(
      clients as unknown as UserDatabaseClientFactory,
      pages as unknown as NotebookPagesService,
    ),
    pdf: new DocumentPageAnnotationsService(
      clients as unknown as UserDatabaseClientFactory,
    ),
  };
}

describe('annotation updates', () => {
  it('moves an owned notebook-page annotation with optimistic concurrency', async () => {
    const { notes, pages, annotation } = setup();

    await expect(
      notes.update(user, notebookId, pageId, annotationId, input),
    ).resolves.toMatchObject({
      id: annotationId,
      points: input.points,
      revision: 4,
    });

    expect(pages.get).toHaveBeenCalledWith(user, notebookId, pageId);
    expect(annotation.update).toHaveBeenCalledWith({
      points: input.points,
      revision: 4,
    });
    expect(annotation.eq).toHaveBeenCalledWith('id', annotationId);
    expect(annotation.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(annotation.eq).toHaveBeenCalledWith('notebook_page_id', pageId);
    expect(annotation.eq).toHaveBeenCalledWith('revision', 3);
    expect(annotation.is).toHaveBeenCalledWith('document_id', null);
  });

  it('edits text through the same revision check', async () => {
    const { notes, annotation } = setup();
    const textUpdate: UpdateAnnotationInput = {
      ...input,
      text: 'Updated explanation',
      fontSize: 0.03,
      color: '#173f5f',
    };

    await notes.update(
      user,
      notebookId,
      pageId,
      annotationId,
      textUpdate,
    );

    expect(annotation.update).toHaveBeenCalledWith({
      points: input.points,
      revision: 4,
      text_content: 'Updated explanation',
      font_size: 0.03,
      color: '#173f5f',
    });
  });

  it('moves an annotation only on its exact owned PDF page', async () => {
    const { pdf, annotation, document, notebook } = setup();

    await expect(
      pdf.update(user, documentId, 7, annotationId, input),
    ).resolves.toMatchObject({ id: annotationId, revision: 4 });

    expect(document.eq).toHaveBeenCalledWith('owner_id', user.id);
    expect(notebook.is).toHaveBeenCalledWith('archived_at', null);
    expect(annotation.eq).toHaveBeenCalledWith('document_id', documentId);
    expect(annotation.eq).toHaveBeenCalledWith('document_page_number', 7);
    expect(annotation.eq).toHaveBeenCalledWith('revision', 3);
    expect(annotation.is).toHaveBeenCalledWith('notebook_page_id', null);
  });

  it('reports a conflict instead of overwriting a newer annotation revision', async () => {
    const { notes, annotation } = setup();
    annotation.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: { id: annotationId }, error: null });

    await expect(
      notes.update(user, notebookId, pageId, annotationId, input),
    ).rejects.toThrow(ConflictException);
  });

  it('does not expose an inaccessible annotation as a conflict', async () => {
    const { notes, annotation } = setup();
    annotation.maybeSingle
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({ data: null, error: null });

    await expect(
      notes.update(user, notebookId, pageId, annotationId, input),
    ).rejects.toThrow(NotFoundException);
  });

  it('does not report a successful move when the database update fails', async () => {
    const { pdf, annotation } = setup();
    annotation.maybeSingle.mockResolvedValueOnce({
      data: null,
      error: { code: '08006' },
    });

    await expect(
      pdf.update(user, documentId, 7, annotationId, input),
    ).rejects.toThrow(ServiceUnavailableException);
  });
});
