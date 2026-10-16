export interface RateLimitConfig {
  limit: number;
  ttl: number;
}

function num(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

// Límites leídos de process.env. Requiere que `load-env` se haya importado antes
// (main.ts lo hace como primer import). Un límite 0 significa "sin límite".
export const RATE_LIMITS = {
  global: {
    limit: num(process.env.RATE_LIMIT_GLOBAL_LIMIT, 100),
    ttl: num(process.env.RATE_LIMIT_GLOBAL_TTL_MS, 60_000),
  },
  reportes: {
    limit: num(process.env.RATE_LIMIT_REPORTES_LIMIT, 2),
    ttl: num(process.env.RATE_LIMIT_REPORTES_TTL_MS, 900_000),
  },
  admin: {
    limit: num(process.env.RATE_LIMIT_ADMIN_LIMIT, 40),
    ttl: num(process.env.RATE_LIMIT_ADMIN_TTL_MS, 900_000),
  },
} satisfies Record<string, RateLimitConfig>;
