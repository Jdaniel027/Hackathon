import { Injectable, Logger } from '@nestjs/common';
import {
  appException,
  APP_ERRORS,
} from '../../common/exception/app-exception.js';

export interface PuntoZona {
  latCentro: number;
  lngCentro: number;
}

export interface LluviaZona {
  latCentro: number;
  lngCentro: number;
  mm1h: number;
  mm24h: number;
  latModelo: number | null;
  lngModelo: number | null;
}

interface OpenMeteoForecastItem {
  latitude?: number;
  longitude?: number;
  hourly?: {
    time?: string[];
    precipitation?: (number | null)[];
  };
}

interface OpenMeteoElevationResponse {
  elevation?: (number | null)[];
}

// Cliente de Open-Meteo. SOLO lo usan los crons y /admin; nunca los endpoints de lectura.
@Injectable()
export class OpenMeteoService {
  private readonly logger = new Logger(OpenMeteoService.name);
  private readonly baseUrl = 'https://api.open-meteo.com/v1';
  private readonly modelo = 'ecmwf_ifs';
  private readonly timezone = 'America/Mazatlan';
  private readonly timeoutMs = 15_000;
  private readonly maxCoordenadas = 100;

  async getLluviaZonas(zonas: PuntoZona[]): Promise<LluviaZona[]> {
    if (zonas.length === 0) {
      return [];
    }

    const url = new URL(`${this.baseUrl}/forecast`);
    url.searchParams.set('latitude', zonas.map((z) => z.latCentro).join(','));
    url.searchParams.set('longitude', zonas.map((z) => z.lngCentro).join(','));
    url.searchParams.set('hourly', 'precipitation');
    url.searchParams.set('past_hours', '24');
    url.searchParams.set('forecast_hours', '1');
    url.searchParams.set('models', this.modelo);
    url.searchParams.set('cell_selection', 'nearest');
    url.searchParams.set('timezone', this.timezone);

    const crudo = await this.pedir(url, 'forecast');
    const items: unknown[] = Array.isArray(crudo) ? crudo : [crudo];
    if (items.length !== zonas.length)
      throw APP_ERRORS.PROVEEDOR_EXTERNO('Open-Meteo');

    return zonas.map((zona, indice) => {
      const item = items[indice] as OpenMeteoForecastItem | undefined;
      const precipitacion = item?.hourly?.precipitation;
      if (
        !Array.isArray(precipitacion) ||
        precipitacion.length === 0 ||
        !precipitacion.every(
          (mm) => typeof mm === 'number' && Number.isFinite(mm) && mm >= 0,
        )
      )
        throw APP_ERRORS.PROVEEDOR_EXTERNO('Open-Meteo');
      return {
        latCentro: zona.latCentro,
        lngCentro: zona.lngCentro,
        mm1h: precipitacion.at(-1)!,
        mm24h: precipitacion
          .slice(-24)
          .reduce<number>((acc, valor) => acc + valor!, 0),
        latModelo: item?.latitude ?? null,
        lngModelo: item?.longitude ?? null,
      };
    });
  }

  async getElevaciones(puntos: PuntoZona[]): Promise<number[]> {
    if (puntos.length === 0) {
      return [];
    }
    if (puntos.length > this.maxCoordenadas) {
      throw appException(
        500,
        'OPEN_METEO_LIMITE',
        `Open-Meteo admite máximo ${this.maxCoordenadas} coordenadas por petición.`,
      );
    }

    const url = new URL(`${this.baseUrl}/elevation`);
    url.searchParams.set('latitude', puntos.map((p) => p.latCentro).join(','));
    url.searchParams.set('longitude', puntos.map((p) => p.lngCentro).join(','));

    const crudo = (await this.pedir(
      url,
      'elevation',
    )) as OpenMeteoElevationResponse;
    if (
      !Array.isArray(crudo?.elevation) ||
      crudo.elevation.length !== puntos.length ||
      !crudo.elevation.every(
        (valor) => typeof valor === 'number' && Number.isFinite(valor),
      )
    )
      throw APP_ERRORS.PROVEEDOR_EXTERNO('Open-Meteo');
    return crudo.elevation as number[];
  }

  private async pedir(url: URL, contexto: string): Promise<unknown> {
    for (let intento = 0; intento < 2; intento += 1) {
      try {
        const respuesta = await fetch(url, {
          signal: AbortSignal.timeout(this.timeoutMs),
          headers: { accept: 'application/json' },
        });
        if (!respuesta.ok) {
          if (intento === 0 && respuesta.status >= 500) continue;
          this.logger.error(
            `Open-Meteo ${contexto} respondió ${respuesta.status}`,
          );
          throw APP_ERRORS.PROVEEDOR_EXTERNO('Open-Meteo');
        }
        return (await respuesta.json()) as unknown;
      } catch (error) {
        if (intento === 0 && !(error instanceof Error && 'getStatus' in error))
          continue;
        this.logger.error(`Open-Meteo ${contexto} no disponible.`, error);
        throw APP_ERRORS.PROVEEDOR_EXTERNO('Open-Meteo');
      }
    }
    throw APP_ERRORS.PROVEEDOR_EXTERNO('Open-Meteo');
  }
}
