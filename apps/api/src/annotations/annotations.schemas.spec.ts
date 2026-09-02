import { describe, expect, it } from 'vitest';

import {
  createAnnotationSchema,
  documentPageNumberSchema,
} from './annotations.schemas.js';

describe('annotation schemas', () => {
  const stroke = {
    kind: 'ink',
    points: [
      { x: 0, y: 0 },
      { x: 1, y: 1 },
    ],
    color: '#173f5f',
    width: 0.004,
    opacity: 1,
  };

  it('accepts a normalized annotation stroke', () => {
    expect(createAnnotationSchema.parse(stroke)).toEqual(stroke);
  });

  it('accepts a stable UUID for save retries and rejects malformed IDs', () => {
    const id = '00000000-0000-4000-8000-000000000010';
    expect(createAnnotationSchema.parse({ ...stroke, id })).toEqual({
      ...stroke,
      id,
    });
    expect(
      createAnnotationSchema.safeParse({ ...stroke, id: 'invalid' }).success,
    ).toBe(false);
  });

  it('rejects points outside the normalized page', () => {
    expect(
      createAnnotationSchema.safeParse({
        ...stroke,
        points: [
          { x: -0.1, y: 0 },
          { x: 0.5, y: 1.1 },
        ],
      }).success,
    ).toBe(false);
  });

  it('rejects malformed colors and single-point strokes', () => {
    expect(
      createAnnotationSchema.safeParse({
        ...stroke,
        color: 'navy',
        points: [{ x: 0.5, y: 0.5 }],
      }).success,
    ).toBe(false);
  });

  it('accepts only supported PDF page numbers', () => {
    expect(documentPageNumberSchema.parse('12')).toBe(12);
    expect(documentPageNumberSchema.safeParse('0').success).toBe(false);
    expect(documentPageNumberSchema.safeParse('5001').success).toBe(false);
  });
});
