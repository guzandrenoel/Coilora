import { z } from 'zod';

const environmentSchema = z.object({
  PORT: z.coerce.number().int().positive().max(65535).default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:3000'),
  SUPABASE_URL: z
    .string()
    .url()
    .transform((value) => value.replace(/\/$/, '')),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_JWT_AUDIENCE: z.string().min(1).default('authenticated'),
});

export type Environment = z.infer<typeof environmentSchema>;

export function validateEnvironment(
  values: Record<string, unknown>,
): Environment {
  const result = environmentSchema.safeParse(values);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');

    throw new Error(`Invalid API environment: ${details}`);
  }

  return result.data;
}
