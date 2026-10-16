import { Injectable, Logger } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { EstadoZona } from '../../generated/prisma/enums.js';
import { APP_ERRORS } from '../../common/exception/app-exception.js';

// El clasificador de foto reutiliza los valores de `EstadoZona` (ver prisma/schema.prisma).
// Por ahora SIN_DATOS queda fuera: la IA siempre debe decidir entre estos tres estados.
export const CLASIFICACIONES_FOTO = [
  EstadoZona.INUNDADO,
  EstadoZona.PRECAUCION,
  EstadoZona.NORMAL,
] as const;

export type ClasificacionFoto = (typeof CLASIFICACIONES_FOTO)[number];

// Tipos MIME aceptados para la foto del reporte.
export const MIME_PERMITIDOS: readonly string[] = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

// System instruction: se configura una sola vez en el servicio.
const SYSTEM_INSTRUCTION = `
Eres un clasificador de fotos de calles para una app de alertas de inundación.
Recibes UNA foto. Clasifícala como:
- INUNDADO: agua cubriendo la calle o banqueta de forma evidente (acumulación, corriente, vehículos o casas con agua).
- PRECAUCION: charcos grandes o agua en partes de la calle, pero transitable.
- NORMAL: no hay agua acumulada relevante, o la imagen no muestra una calle/zona exterior.
Responde solo con el JSON del esquema. No expliques.
`.trim();

// Esquema de salida estructurada (mismos valores que CLASIFICACIONES_FOTO).
const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    clasificacion: {
      type: 'string',
      enum: [...CLASIFICACIONES_FOTO],
    },
  },
  required: ['clasificacion'],
} as const;

@Injectable()
export class GeminiService {
  private readonly logger = new Logger(GeminiService.name);
  private readonly client: GoogleGenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY no configurada en variables de entorno');
    }
    this.client = new GoogleGenAI({ apiKey });
    // Confirmar modelo vigente en Google AI Studio. Usar flash para menor latencia/costo.
    this.model = 'gemini-1.5-flash';
  }

  async clasificarFoto(
    buffer: Buffer,
    mimeType: string,
  ): Promise<ClasificacionFoto> {
    if (!MIME_PERMITIDOS.includes(mimeType)) {
      throw APP_ERRORS.REPORT_ARCHIVO_INVALIDO();
    }

    const base64 = buffer.toString('base64');

    try {
      const response = await this.client.models.generateContent({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64,
                },
              },
            ],
          },
        ],
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
        },
      });

      const text = response.text ?? '{}';
      const parsed = JSON.parse(text) as { clasificacion?: string };

      if (!this.esClasificacionValida(parsed.clasificacion)) {
        this.logger.warn(`Gemini respondió clasificación inválida: ${text}`);
        throw APP_ERRORS.GEMINI_NO_DISPONIBLE();
      }

      return parsed.clasificacion;
    } catch (error) {
      if (error instanceof SyntaxError) {
        this.logger.error('Error parseando respuesta JSON de Gemini', error);
      } else if (error && typeof error === 'object' && 'statusCode' in error) {
        // Ya es un AppException, re-lanzar
        throw error;
      } else {
        this.logger.error('Error llamando a Gemini', error);
      }
      throw APP_ERRORS.GEMINI_NO_DISPONIBLE();
    }
  }

  private esClasificacionValida(
    valor: string | undefined,
  ): valor is ClasificacionFoto {
    return (
      valor !== undefined &&
      (CLASIFICACIONES_FOTO as readonly string[]).includes(valor)
    );
  }
}
