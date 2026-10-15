import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { Request, Response } from 'express';
import { APP_ERRORS } from '../exception/app-exception.js';

interface ErrorResuelto {
  statusCode: number;
  code: string;
  message: string;
  details: unknown;
}

interface PrismaLikeError {
  name?: unknown;
  code?: unknown;
}

// Traducción de códigos de error de Prisma a respuestas legibles.
const PRISMA_CODE_MAP: Record<string, ErrorResuelto> = {
  P2002: {
    statusCode: HttpStatus.CONFLICT,
    code: 'CONFLICTO_DUPLICADO',
    message: 'Ya existe un registro con esos datos.',
    details: null,
  },
  P2003: {
    statusCode: HttpStatus.BAD_REQUEST,
    code: 'RELACION_INVALIDA',
    message: 'La referencia a otro registro no es válida.',
    details: null,
  },
  P2025: {
    statusCode: HttpStatus.NOT_FOUND,
    code: 'REGISTRO_NO_ENCONTRADO',
    message: 'El registro solicitado no existe.',
    details: null,
  },
  P2034: {
    statusCode: HttpStatus.CONFLICT,
    code: 'CONFLICTO_TRANSACCION',
    message: 'Conflicto al escribir. Reintenta la operación.',
    details: null,
  },
  P2024: {
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'POOL_AGOTADO',
    message: 'El grupo de conexiones está saturado. Reintenta en un momento.',
    details: null,
  },
  P1001: {
    statusCode: HttpStatus.SERVICE_UNAVAILABLE,
    code: 'BD_INACCESIBLE',
    message: 'No se pudo conectar con la base de datos.',
    details: null,
  },
};

@Catch()
export class AppGlobalFilter implements ExceptionFilter {
  private readonly logger = new Logger(AppGlobalFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();

    const resuelto = this.resolver(exception, response);

    if (resuelto.statusCode >= 500) {
      this.logger.error(
        `[${resuelto.code}] ${request.method} ${request.originalUrl} → ${resuelto.statusCode}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    }

    response.status(resuelto.statusCode).json({
      requestId: request.requestId ?? null,
      code: resuelto.code,
      message: resuelto.message,
      statusCode: resuelto.statusCode,
      timestamp: new Date().toISOString(),
      path: request.originalUrl,
      details: resuelto.details,
    });
  }

  private resolver(exception: unknown, response: Response): ErrorResuelto {
    // 1) Prisma (duck-typing para no acoplar common a los tipos generados)
    if (this.esErrorPrisma(exception)) {
      const codice = String(exception.code);
      const mapeado = PRISMA_CODE_MAP[codice];
      if (mapeado) {
        return mapeado;
      }
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        code: 'ERROR_BASE_DATOS',
        message: 'Ocurrió un error al consultar la base de datos.',
        details: null,
      };
    }

    // 2) HttpException (incluye nuestras appException, el 404 del framework y el 429 del throttler)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();

      if (status === HttpStatus.TOO_MANY_REQUESTS) {
        return this.resolverRateLimit(response);
      }

      if (status === HttpStatus.NOT_FOUND && typeof payload === 'string') {
        return {
          statusCode: HttpStatus.NOT_FOUND,
          code: 'RUTA_NO_ENCONTRADA',
          message: `La ruta ${payload} no existe.`,
          details: null,
        };
      }

      if (payload && typeof payload === 'object') {
        const cuerpo = payload as Partial<ErrorResuelto>;
        if (typeof cuerpo.code === 'string') {
          return {
            statusCode: status,
            code: cuerpo.code,
            message: cuerpo.message ?? exception.message,
            details: cuerpo.details ?? null,
          };
        }
        const mensaje =
          typeof (payload as { message?: unknown }).message === 'string'
            ? (payload as { message: string }).message
            : exception.message;
        return {
          statusCode: status,
          code: this.codigoDesdeStatus(status),
          message: mensaje,
          details: null,
        };
      }

      return {
        statusCode: status,
        code: this.codigoDesdeStatus(status),
        message: exception.message,
        details: null,
      };
    }

    // 3) Desconocido
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Ocurrió un error inesperado.',
      details: null,
    };
  }

  private resolverRateLimit(response: Response): ErrorResuelto {
    const header = response.getHeader('Retry-After');
    const segundos =
      typeof header === 'string' || typeof header === 'number'
        ? Number(header)
        : undefined;
    const error = APP_ERRORS.RATE_LIMIT_EXCEEDED(
      Number.isFinite(segundos) && segundos !== undefined
        ? segundos
        : undefined,
    );
    const payload = error.getResponse() as ErrorResuelto;
    return {
      statusCode: HttpStatus.TOO_MANY_REQUESTS,
      code: payload.code,
      message: payload.message,
      details: payload.details,
    };
  }

  private esErrorPrisma(
    exception: unknown,
  ): exception is PrismaLikeError & { code: string } {
    if (typeof exception !== 'object' || exception === null) {
      return false;
    }
    const candidato = exception as PrismaLikeError;
    return (
      typeof candidato.code === 'string' &&
      typeof candidato.name === 'string' &&
      candidato.name.startsWith('PrismaClient')
    );
  }

  private codigoDesdeStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'SOLICITUD_INVALIDA';
      case HttpStatus.FORBIDDEN:
        return 'PROHIBIDO';
      case HttpStatus.NOT_FOUND:
        return 'NO_ENCONTRADO';
      case HttpStatus.CONFLICT:
        return 'CONFLICTO';
      case HttpStatus.PAYLOAD_TOO_LARGE:
        return 'CARGA_MUY_GRANDE';
      case HttpStatus.UNSUPPORTED_MEDIA_TYPE:
        return 'MEDIA_NO_SOPORTADA';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'RATE_LIMIT_EXCEEDED';
      default:
        return 'ERROR_HTTP';
    }
  }
}
