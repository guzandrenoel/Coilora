import { z } from 'zod';

const allowedMediaTypes: Record<string, readonly string[]> = {
  pdf: ['application/pdf'],
  image: ['image/png', 'image/jpeg', 'image/webp'],
  text: ['text/plain'],
  markdown: ['text/markdown', 'text/x-markdown', 'text/plain'],
};

export const createDocumentSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, 'Enter a document title.')
      .max(200, 'Title must be 200 characters or fewer.'),

    originalFilename: z
      .string()
      .trim()
      .min(1, 'A filename is required.')
      .max(255, 'Filename must be 255 characters or fewer.')
      .regex(/^[^/\\]+$/, 'Filename must not contain a directory path.'),

    sourceType: z.enum(['pdf', 'image', 'text', 'markdown']),

    mediaType: z.string().trim().min(1).max(255),

    byteSize: z
      .number()
      .int()
      .min(1, 'The file must not be empty.')
      .max(52428800, 'Files must be 50 MB or smaller.'),
  })
  .strict()
  .refine(
    (input) => allowedMediaTypes[input.sourceType].includes(input.mediaType),
    {
      message: 'The file type does not match the selected source type.',
      path: ['mediaType'],
    },
  );

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
export const listDocumentsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(0).max(10000).default(0),
  })
  .strict();

export const documentPageCountSchema = z
  .object({
    pageCount: z.number().int().min(1).max(5000),
  })
  .strict();

export const documentBookmarkSchema = z
  .object({ bookmarked: z.boolean() })
  .strict();

export const moveDocumentSchema = z
  .object({
    destinationNotebookId: z.uuid('Select a valid destination notebook.'),
  })
  .strict();
