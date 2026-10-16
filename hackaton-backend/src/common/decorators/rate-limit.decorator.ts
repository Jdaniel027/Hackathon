import { SkipThrottle, Throttle } from '@nestjs/throttler';

// Aplica un límite específico a un endpoint (o controlador).
// Si `limit` es 0, el throttling queda desactivado para esa ruta (útil en pruebas).
export function RateLimitEspecifico(
  limit: number,
  ttl?: number,
): MethodDecorator & ClassDecorator {
  if (limit <= 0) {
    return SkipThrottle();
  }
  return Throttle({
    default: { limit, ...(ttl !== undefined ? { ttl } : {}) },
  });
}
