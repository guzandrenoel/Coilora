import { z } from 'zod';

export const annotationKindSchema = z.enum(['ink', 'highlight']);

const normalizedCoordinateSchema = z.number().finite().min(0).max(1);

export const annotationPointSchema = z
  .object({
    x: normalizedCoordinateSchema,
    y: normalizedCoordinateSchema,
  })
  .strict();

export const createAnnotationSchema = z
  .object({
    id: z.uuid().optional(),
    kind: annotationKindSchema,
    points: z
      .array(annotationPointSchema)
      .min(2, 'A stroke requires at least two points.')
      .max(4096, 'A stroke contains too many points.'),
    color: z
      .string()
      .regex(/^#[0-9a-f]{6}$/i, 'Choose a valid annotation color.'),
    width: z.number().finite().min(0.0005).max(0.1),
    opacity: z.number().finite().min(0).max(1).default(1),
  })
  .strict();

export const updateAnnotationSchema = z
  .object({
    points: z
      .array(annotationPointSchema)
      .min(2, 'A stroke requires at least two points.')
      .max(4096, 'A stroke contains too many points.'),
    revision: z.number().int().min(1),
  })
  .strict();

export const annotationListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(0).max(10000).default(0),
  })
  .strict();

export const annotationIdSchema = z.uuid('Select a valid annotation.');

export const documentPageNumberSchema = z.coerce
  .number()
  .int()
  .min(1)
  .max(5000);

export type CreateAnnotationInput = z.infer<typeof createAnnotationSchema>;
export type UpdateAnnotationInput = z.infer<typeof updateAnnotationSchema>;
