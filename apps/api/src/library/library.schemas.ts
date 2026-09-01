import { z } from 'zod';

const optionalDescription = z
  .string()
  .trim()
  .max(1000, 'Description must be 1000 characters or fewer.')
  .optional()
  .transform((value) => value || null);

export const coverColorSchema = z.enum([
  'sage',
  'ocean',
  'lavender',
  'rose',
  'peach',
  'yellow',
  'slate',
]);

export const createCourseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Course name is required.')
    .max(120, 'Course name must be 120 characters or fewer.'),
  description: optionalDescription,
  color: coverColorSchema.default('sage'),
});

export const createNotebookSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Notebook title is required.')
    .max(160, 'Notebook title must be 160 characters or fewer.'),
  description: optionalDescription,
  coverColor: coverColorSchema.default('sage'),
  courseId: z
    .uuid('Select a valid course.')
    .nullable()
    .optional()
    .default(null),
});

export const updateNotebookSchema = z
  .object({
    title: createNotebookSchema.shape.title,
    coverColor: coverColorSchema,
  })
  .strict();

export const updateCourseSchema = z
  .object({
    name: createCourseSchema.shape.name,
    color: coverColorSchema.optional(),
  })
  .strict();

export const notebookListQuerySchema = z.object({
  courseId: z.uuid('Select a valid course.').optional(),
});

export const paperStyleSchema = z.enum([
  'blank',
  'dotted',
  'ruled',
  'grid',
  'cornell',
]);

export const createNotebookPageSchema = z
  .object({ paperStyle: paperStyleSchema })
  .strict();

export const notebookPageListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(0).max(10000).default(0),
  })
  .strict();

export const notebookIdSchema = z.uuid('Select a valid notebook.');
export const courseIdSchema = z.uuid('Select a valid course.');

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type CreateNotebookInput = z.infer<typeof createNotebookSchema>;
export type UpdateNotebookInput = z.infer<typeof updateNotebookSchema>;
export type UpdateCourseInput = z.infer<typeof updateCourseSchema>;
export type NotebookListQuery = z.infer<typeof notebookListQuerySchema>;
export type CreateNotebookPageInput = z.infer<typeof createNotebookPageSchema>;
