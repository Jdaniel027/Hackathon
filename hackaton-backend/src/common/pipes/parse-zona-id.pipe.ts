import { ParseIntPipe } from '@nestjs/common';
import { AppBadRequestException } from '../exception/app-bad-request.exception.js';

export function parseZonaIdPipe(field: string): ParseIntPipe {
  return new ParseIntPipe({
    exceptionFactory: () =>
      new AppBadRequestException(
        'INVALID_ZONA_ID',
        'El id de la zona debe ser un entero.',
        { field },
      ),
  });
}
