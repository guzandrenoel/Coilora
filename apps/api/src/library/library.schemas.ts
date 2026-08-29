import { z } from 'zod';

const optionalDescription = z
  .string()
  .trim()
  .max(1000, 'Description must be 1000 characters or fewer.')
  .optional()
  .transform((value) => value || null);

export const createCourseSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Course name is required.')
    .max(120, 'Course name must be 120 characters or fewer.'),
  description: optionalDescription,
});

export const createNotebookSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Notebook title is required.')
    .max(160, 'Notebook title must be 160 characters or fewer.'),
  description: optionalDescription,
  courseId: z.uuid('Select a valid course.').nullable().optional().default(null),
});

export const notebookListQuerySchema = z.object({
  courseId: z.uuid('Select a valid course.').optional(),
});

export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type CreateNotebookInput = z.infer<typeof createNotebookSchema>;
export type NotebookListQuery = z.infer<typeof notebookListQuerySchema>;
export const notebookIdSchema = z.uuid("Select a valid notebook.");
export const courseIdSchema = z.uuid("Select a valid course.");