import { Injectable } from '@nestjs/common';
import { APP_ERRORS } from '../../common/exception/app-exception.js';

export type ClasificacionFoto = 'INUNDADO' | 'PARCIAL' | 'NO_INUNDADO';

// Tipos MIME aceptados para la foto del reporte.
export const MIME_PERMITIDOS: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

@Injectable()
export class GeminiService {
  // TODO(DEVELOPER_V): integrar @google/genai con system instruction + salida
  // estructurada (INUNDADO / PARCIAL / NO_INUNDADO). El paquete ya está instalado.
  async clasificarFoto(
    _buffer: Buffer,
    _mimeType: string,
  ): Promise<ClasificacionFoto> {
    throw APP_ERRORS.NO_IMPLEMENTADO(
      'La clasificación con Gemini aún no está implementada (DEVELOPER_V, Fase 2).',
    );
  }
}
