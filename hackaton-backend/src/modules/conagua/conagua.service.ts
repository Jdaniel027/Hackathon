import { Injectable, Logger } from '@nestjs/common';
import { gunzipSync } from 'node:zlib';
import { APP_ERRORS } from '../../common/exception/app-exception.js';

export interface PronosticoMunicipio {
  ides: number;
  idmun: number;
  nmun: string;
  prec: number;
  hloc: string;
  nhor: number;
}

export interface IdentificadorSmn {
  idEstadoSmn: number;
  idMunSmn: number;
}

const URL_HORARIO =
  'https://smn.conagua.gob.mx/tools/GUI/webservices/?method=3';
const MAX_BYTES = 15_000_000;

@Injectable()
export class ConaguaService {
  private readonly logger = new Logger(ConaguaService.name);

  async getPronosticoPorHora(
    idEstadoSmn: number,
    idMunSmn: number,
  ): Promise<PronosticoMunicipio[]> {
    const resultados = await this.getPronosticosPorHora([
      { idEstadoSmn, idMunSmn },
    ]);
    return resultados.get(`${idEstadoSmn}:${idMunSmn}`) ?? [];
  }

  // Descarga el archivo nacional solo una vez por ciclo, no una vez por municipio.
  async getPronosticosPorHora(
    municipios: IdentificadorSmn[],
  ): Promise<Map<string, PronosticoMunicipio[]>> {
    const resultados = new Map<string, PronosticoMunicipio[]>();
    for (const municipio of municipios) {
      resultados.set(`${municipio.idEstadoSmn}:${municipio.idMunSmn}`, []);
    }
    if (municipios.length === 0) return resultados;

    try {
      const respuesta = await fetch(URL_HORARIO, {
        signal: AbortSignal.timeout(20_000),
        headers: { accept: 'application/octet-stream' },
      });
      if (
        !respuesta.ok ||
        Number(respuesta.headers.get('content-length')) > MAX_BYTES
      ) {
        throw new Error(`Respuesta de Conagua inválida: ${respuesta.status}`);
      }
      const comprimido = Buffer.from(await respuesta.arrayBuffer());
      if (comprimido.length > MAX_BYTES)
        throw new Error('Archivo de Conagua demasiado grande');
      const json =
        comprimido[0] === 0x1f && comprimido[1] === 0x8b
          ? gunzipSync(comprimido, { maxOutputLength: 150_000_000 }).toString(
              'utf8',
            )
          : comprimido.toString('utf8');
      const filas: unknown = JSON.parse(json);
      if (!Array.isArray(filas))
        throw new Error('El pronóstico no contiene un arreglo');

      for (const fila of filas as unknown[]) {
        if (!fila || typeof fila !== 'object') continue;
        const dato = fila as Record<string, unknown>;
        const ides = Number(dato.ides);
        const idmun = Number(dato.idmun);
        const destino = resultados.get(`${ides}:${idmun}`);
        if (!destino) continue;
        const prec =
          typeof dato.prec === 'string'
            ? Number.parseFloat(dato.prec.trim())
            : Number(dato.prec);
        const nhor = Number(dato.nhor);
        if (
          !Number.isFinite(prec) ||
          prec < 0 ||
          !Number.isInteger(nhor) ||
          typeof dato.hloc !== 'string' ||
          !/^\d{8}T\d{2}$/.test(dato.hloc) ||
          typeof dato.nmun !== 'string'
        )
          continue;
        destino.push({
          ides,
          idmun,
          nmun: dato.nmun,
          prec,
          hloc: dato.hloc,
          nhor,
        });
      }
      return resultados;
    } catch (error) {
      this.logger.error(
        'No se pudo leer el pronóstico horario de Conagua.',
        error,
      );
      throw APP_ERRORS.PROVEEDOR_EXTERNO('Conagua');
    }
  }
}
