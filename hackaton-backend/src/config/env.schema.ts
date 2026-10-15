import { z } from 'zod';

// Validación de variables de entorno con zod.
// La app no arranca si falta algo obligatorio (ver ARCHITECTURE.md §9).
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CORS_ORIGINS: z.string().default('http://localhost:5173'),

  DATABASE_URL: z.string().min(1, 'DATABASE_URL es obligatoria.'),

  GEMINI_API_KEY: z.string().min(1, 'GEMINI_API_KEY es obligatoria.'),

  ADMIN_API_KEY: z
    .string()
    .min(32, 'ADMIN_API_KEY debe tener al menos 32 caracteres.'),

  // Rate limiting (0 = sin límite)
  RATE_LIMIT_GLOBAL_LIMIT: z.coerce.number().int().min(0).default(100),
  RATE_LIMIT_GLOBAL_TTL_MS: z.coerce.number().int().min(0).default(60_000),
  RATE_LIMIT_REPORTES_LIMIT: z.coerce.number().int().min(0).default(2),
  RATE_LIMIT_REPORTES_TTL_MS: z.coerce.number().int().min(0).default(900_000),
  RATE_LIMIT_ADMIN_LIMIT: z.coerce.number().int().min(0).default(40),
  RATE_LIMIT_ADMIN_TTL_MS: z.coerce.number().int().min(0).default(900_000),

  // Redis (futuro, opcional)
  REDIS_URL: z.string().optional(),
  MAPA_CACHE_TTL_SECONDS: z.coerce.number().int().min(0).optional(),
});

export type EnvConfig = z.infer<typeof envSchema>;

export function validateEnv(config: Record<string, unknown>): EnvConfig {
  const parsed = envSchema.safeParse(config);
  if (!parsed.success) {
    const detalle = parsed.error.issues
      .map((issue) => `${issue.path.join('.') || '(raíz)'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Configuración de entorno inválida → ${detalle}`);
  }
  return parsed.data;
}
