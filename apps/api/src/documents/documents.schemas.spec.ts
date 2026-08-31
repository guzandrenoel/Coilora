import { describe, expect, it } from 'vitest';

import { createDocumentSchema } from './documents.schemas.js';

const validInput = {
  title: 'Anatomy lecture',
  originalFilename: 'anatomy.pdf',
  sourceType: 'pdf',
  mediaType: 'application/pdf',
  byteSize: 1024,
};

describe('createDocumentSchema', () => {
  it('accepts valid PDF metadata', () => {
    expect(createDocumentSchema.parse(validInput)).toEqual(validInput);
  });

  it('accepts the maximum file size', () => {
    expect(
      createDocumentSchema.safeParse({
        ...validInput,
        byteSize: 52428800,
      }).success,
    ).toBe(true);
  });

  it('accepts Markdown with a plain-text MIME type', () => {
    expect(
      createDocumentSchema.safeParse({
        ...validInput,
        originalFilename: 'notes.md',
        sourceType: 'markdown',
        mediaType: 'text/plain',
      }).success,
    ).toBe(true);
  });

  it.each([
    { reason: 'empty titles', changes: { title: '   ' } },
    { reason: 'empty filenames', changes: { originalFilename: '' } },
    { reason: 'empty files', changes: { byteSize: 0 } },
    { reason: 'oversized files', changes: { byteSize: 52428801 } },
    { reason: 'fractional byte sizes', changes: { byteSize: 1.5 } },
    { reason: 'unsupported source types', changes: { sourceType: 'video' } },
    { reason: 'mismatched MIME types', changes: { mediaType: 'image/png' } },
    {
      reason: 'forward-slash paths',
      changes: { originalFilename: '../lecture.pdf' },
    },
    {
      reason: 'backslash paths',
      changes: { originalFilename: '..\\lecture.pdf' },
    },
    {
      reason: 'client-supplied ownership',
      changes: { ownerId: 'another-user' },
    },
    {
      reason: 'client-supplied processing status',
      changes: { status: 'ready' },
    },
  ])('rejects $reason', ({ changes }) => {
    expect(
      createDocumentSchema.safeParse({
        ...validInput,
        ...changes,
      }).success,
    ).toBe(false);
  });
});