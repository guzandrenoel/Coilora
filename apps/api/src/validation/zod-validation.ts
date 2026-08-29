import { BadRequestException } from '@nestjs/common';
import type { ZodType } from 'zod';

export function parseWithSchema<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);

  if (result.success) {
    return result.data;
  }

  throw new BadRequestException(
    result.error.issues.map((issue) => issue.message).join(' '),
  );
}
