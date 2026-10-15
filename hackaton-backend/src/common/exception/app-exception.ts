import { HttpException } from '@nestjs/common';

export interface AppErrorBody {
  code: string;
  message: string;
  statusCode: number;
  details: unknown;
}

// Envelope único de error para toda la API (ver ARCHITECTURE.md §8).
export function appException(
  statusCode: number,
  code: string,
  message: string,
  details: unknown = null,
): HttpException {
  return new HttpException({ code, message, statusCode, details }, statusCode);
}

// Catálogo de errores del dominio.
export const APP_ERRORS = {
  ADMIN_KEY_MISSING: () =>
    appException(403, 'ADMIN_KEY_MISSING', 'Falta el encabezado x-api-key.'),

  ADMIN_KEY_INVALIDA: () =>
    appException(403, 'ADMIN_KEY_INVALIDA', 'La clave de administración no es válida.'),

  MUNICIPIO_NO_ENCONTRADO: (slug?: string) =>
    appException(
      404,
      'MUNICIPIO_NO_ENCONTRADO',
      slug ? `No existe el municipio "${slug}".` : 'Municipio no encontrado.',
    ),

  ZONA_NO_ENCONTRADA: (id?: number) =>
    appException(
      404,
      'ZONA_NO_ENCONTRADA',
      id !== undefined ? `No existe la zona ${id}.` : 'Zona no encontrada.',
    ),

  RATE_LIMIT_EXCEEDED: (retryAfterSeg?: number) =>
    appException(
      429,
      'RATE_LIMIT_EXCEEDED',
      'Demasiadas solicitudes. Intenta más tarde.',
      retryAfterSeg !== undefined ? { retryAfterSeg } : null,
    ),

  REPORT_FUERA_DE_ZONA: () =>
    appException(
      400,
      'REPORT_FUERA_DE_ZONA',
      'Las coordenadas del reporte no caen en ninguna zona.',
    ),

  REPORT_FECHA_INVALIDA: () =>
    appException(
      400,
      'REPORT_FECHA_INVALIDA',
      'La foto es más antigua de lo permitido (30 minutos).',
    ),

  REPORT_ARCHIVO_INVALIDO: () =>
    appException(
      415,
      'REPORT_ARCHIVO_INVALIDO',
      'El archivo de la foto no es válido o su tipo no está permitido.',
    ),

  REPORT_ARCHIVO_MUY_GRANDE: () =>
    appException(
      413,
      'REPORT_ARCHIVO_MUY_GRANDE',
      'La foto supera el tamaño máximo permitido.',
    ),

  GEMINI_NO_DISPONIBLE: () =>
    appException(
      503,
      'GEMINI_NO_DISPONIBLE',
      'El clasificador de imágenes no está disponible en este momento.',
    ),

  PROVEEDOR_EXTERNO: (nombre: string) =>
    appException(
      503,
      'PROVEEDOR_EXTERNO_NO_DISPONIBLE',
      `El proveedor ${nombre} no está disponible.`,
    ),

  CRON_DESCONOCIDO: (nombre: string) =>
    appException(
      400,
      'CRON_DESCONOCIDO',
      `El cron "${nombre}" no existe.`,
    ),

  NO_IMPLEMENTADO: (detalle: string) =>
    appException(501, 'NO_IMPLEMENTADO', detalle),
} as const;
