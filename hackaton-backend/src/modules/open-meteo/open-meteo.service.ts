import { Injectable, Logger } from '@nestjs/common';
import { appException, APP_ERRORS } from '../../common/exception/app-exception.js';

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
    const items = Array.isArray(crudo) ? crudo : [crudo];

    return zonas.map((zona, indice) => {
      const item = items[indice] as OpenMeteoForecastItem | undefined;
      const precipitacion = item?.hourly?.precipitation ?? [];
      return {
        latCentro: zona.latCentro,
        lngCentro: zona.lngCentro,
        mm1h: precipitacion.length > 0 ? (precipitacion.at(-1) ?? 0) : 0,
        mm24h: precipitacion.reduce<number>((acc, valor) => acc + (valor ?? 0), 0),
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

    const crudo = (await this.pedir(url, 'elevation')) as OpenMeteoElevationResponse;
    return (crudo.elevation ?? []).map((valor) => valor ?? 0);
  }

  private async pedir(url: URL, contexto: string): Promise<unknown> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const respuesta = await fetch(url, {
        signal: controller.signal,
        headers: { accept: 'application/json' },
      });
      if (!respuesta.ok) {
        this.logger.error(`Open-Meteo ${contexto} respondió ${respuesta.status}`);
        throw APP_ERRORS.PROVEEDOR_EXTERNO('Open-Meteo');
      }
      return (await respuesta.json()) as unknown;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        this.logger.error(`Open-Meteo ${contexto} agotó el tiempo de espera.`);
        throw APP_ERRORS.PROVEEDOR_EXTERNO('Open-Meteo');
      }
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }
}
