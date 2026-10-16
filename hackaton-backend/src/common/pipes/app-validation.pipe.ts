import { Injectable, ValidationPipe } from '@nestjs/common';
import type { ValidationError, ValidationPipeOptions } from '@nestjs/common';
import { AppBadRequestException } from '../exception/app-bad-request.exception.js';
import { parseValidationMessage } from '../exception/validation-message.js';

interface PrimerError {
  code: string;
  message: string;
  field: string | null;
}

// Recorre el árbol de errores de class-validator y devuelve el primero con su código.
function buscarPrimerError(
  errors: ValidationError[],
  rutaPadre = '',
): PrimerError | null {
  for (const error of errors) {
    const ruta = rutaPadre ? `${rutaPadre}.${error.property}` : error.property;

    if (error.constraints) {
      const crudo = Object.values(error.constraints)[0];
      const parseado = parseValidationMessage(crudo);
      return {
        code: parseado?.code ?? 'INVALID_INPUT',
        message: parseado?.message ?? crudo,
        field: ruta,
      };
    }

    if (error.children && error.children.length > 0) {
      const anidado = buscarPrimerError(error.children, ruta);
      if (anidado) {
        return anidado;
      }
    }
  }
  return null;
}

@Injectable()
export class AppValidationPipe extends ValidationPipe {
  constructor() {
    super({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]): AppBadRequestException => {
        const primero = buscarPrimerError(errors);
        return new AppBadRequestException(
          primero?.code ?? 'INVALID_INPUT',
          primero?.message ?? 'Entrada inválida.',
          { field: primero?.field ?? null },
        );
      },
    } satisfies ValidationPipeOptions);
  }
}
