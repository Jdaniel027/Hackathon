import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

export const REQUEST_ID_HEADER = 'x-request-id';

// Middleware Express simple: hereda o genera un x-request-id y lo devuelve en la respuesta.
// Se aplica globalmente en configurar-app.ts.
export function requestIdMiddleware(
  req: Request & { requestId?: string },
  res: Response,
  next: NextFunction,
): void {
  const entrante = req.headers[REQUEST_ID_HEADER];
  const id =
    typeof entrante === 'string' && entrante.length > 0
      ? entrante
      : randomUUID();

  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
