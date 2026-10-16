import { Injectable } from '@nestjs/common';
import type {
  CallHandler,
  ExecutionContext,
  NestInterceptor,
} from '@nestjs/common';
import { map } from 'rxjs';
import type { Observable } from 'rxjs';

// Prisma puede devolver BigInt; JSON.stringify no lo soporta. Lo serializamos a string.
function serializar(valor: unknown): unknown {
  if (typeof valor === 'bigint') {
    return valor.toString();
  }
  if (Array.isArray(valor)) {
    return valor.map(serializar);
  }
  if (valor !== null && typeof valor === 'object') {
    if (valor instanceof Date) {
      return valor;
    }
    return Object.fromEntries(
      Object.entries(valor).map(([clave, v]) => [clave, serializar(v)]),
    );
  }
  return valor;
}

@Injectable()
export class BigIntSerializeInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map(serializar));
  }
}
