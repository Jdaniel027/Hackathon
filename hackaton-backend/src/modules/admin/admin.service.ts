import { Injectable, Logger } from '@nestjs/common';
import { APP_ERRORS } from '../../common/exception/app-exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { M_POR_GRADO } from '../zonas/utils/geo.util.js';
import { ZonasService } from '../zonas/zonas.service.js';
import { OpenMeteoService } from '../open-meteo/open-meteo.service.js';
import type { PuntoZona } from '../open-meteo/open-meteo.service.js';
import type { ZonaMapa } from '../zonas/zonas.types.js';
import type { GenerarZonasDto } from './dto/generar-zonas.dto.js';
import type { RegistrarCiclonDto } from './dto/registrar-ciclon.dto.js';
import type { SimularLluviaDto } from './dto/simular-lluvia.dto.js';

const PROLONGACION_CICLON_MS = 3 * 24 * 60 * 60 * 1000; // 3 días
const PASO_MALLA_M = 1000;
const UMBRAL_ALTURA_M = 1.5;
const RADIO_RIESGO_ALTURA_M = 500;
const RADIO_RIESGO_CICLON_M = 1500;

export interface RiesgoAlturaResultado {
  zonaId: number;
  medianaM: number;
  puntosEvaluados: number;
  creados: number;
}

export interface RegistrarCiclonResultado {
  ok: true;
  zonaId: number;
  venceEn: string;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly zonas: ZonasService,
    private readonly openMeteo: OpenMeteoService,
  ) {}

  async simularLluvia(dto: SimularLluviaDto): Promise<ZonaMapa> {
    return this.zonas.simularLluvia(dto.zonaId, dto.mm1h, dto.mm24h);
  }

  async generarZonas(dto: GenerarZonasDto): Promise<{ creadas: number }> {
    return this.zonas.generarZonas(
      dto.municipioSlug,
      [dto.sw.lat, dto.sw.lng],
      [dto.ne.lat, dto.ne.lng],
    );
  }

  // Genera ZonaRiesgo ALTURA en los puntos bajos de la zona (relativo a su mediana).
  async riesgoPorAltura(zonaId: number): Promise<RiesgoAlturaResultado> {
    const zona = await this.prisma.zona.findUnique({ where: { id: zonaId } });
    if (!zona) {
      throw APP_ERRORS.ZONA_NO_ENCONTRADA(zonaId);
    }

    const puntos = this.mallaPuntos(
      zona.latCentro,
      zona.lngCentro,
      zona.ladoM,
      PASO_MALLA_M,
    );
    const elevaciones = await this.openMeteo.getElevaciones(puntos);
    const mediana = this.mediana(elevaciones);

    const bajos = puntos.filter(
      (_punto, indice) => (elevaciones[indice] ?? mediana) < mediana - UMBRAL_ALTURA_M,
    );

    if (bajos.length === 0) {
      return { zonaId, medianaM: mediana, puntosEvaluados: puntos.length, creados: 0 };
    }

    const resultado = await this.prisma.zonaRiesgo.createMany({
      data: bajos.map((punto) => ({
        municipioId: zona.municipioId,
        lat: punto.latCentro,
        lng: punto.lngCentro,
        radioM: RADIO_RIESGO_ALTURA_M,
        motivo: 'ALTURA' as const,
        origen: 'MANUAL' as const,
      })),
    });

    this.logger.log(
      `Zona ${zonaId}: ${resultado.count} riesgos ALTURA creados (mediana ${mediana.toFixed(1)} m).`,
    );

    return {
      zonaId,
      medianaM: mediana,
      puntosEvaluados: puntos.length,
      creados: resultado.count,
    };
  }

  async registrarCiclon(dto: RegistrarCiclonDto): Promise<RegistrarCiclonResultado> {
    const zona = await this.zonas.buscarZonaPorPunto(dto.lat, dto.lng);
    if (!zona) {
      throw APP_ERRORS.REPORT_FUERA_DE_ZONA();
    }

    const venceEn = new Date(Date.now() + PROLONGACION_CICLON_MS);

    await this.prisma.$transaction([
      this.prisma.zonaRiesgo.create({
        data: {
          municipioId: zona.municipioId,
          lat: dto.lat,
          lng: dto.lng,
          radioM: RADIO_RIESGO_CICLON_M,
          motivo: 'INUNDACION',
          origen: 'CICLON',
          venceEn,
        },
      }),
      this.prisma.reporte.create({
        data: {
          zonaId: zona.id,
          fuente: 'CICLON',
          tipo: 'PENDIENTE',
        },
      }),
    ]);

    return { ok: true, zonaId: zona.id, venceEn: venceEn.toISOString() };
  }

  private mallaPuntos(
    latCentro: number,
    lngCentro: number,
    ladoM: number,
    pasoM: number,
  ): PuntoZona[] {
    const mitad = ladoM / 2;
    const gradosPorLng = M_POR_GRADO * Math.cos((latCentro * Math.PI) / 180);
    const pasos = Math.floor(ladoM / pasoM);

    const puntos: PuntoZona[] = [];
    for (let i = 0; i <= pasos; i += 1) {
      const offsetLat = -mitad + i * pasoM;
      for (let j = 0; j <= pasos; j += 1) {
        const offsetLng = -mitad + j * pasoM;
        puntos.push({
          latCentro: Number((latCentro + offsetLat / M_POR_GRADO).toFixed(6)),
          lngCentro: Number((lngCentro + offsetLng / gradosPorLng).toFixed(6)),
        });
      }
    }
    return puntos;
  }

  private mediana(valores: number[]): number {
    if (valores.length === 0) {
      return 0;
    }
    const ordenados = [...valores].sort((a, b) => a - b);
    const medio = Math.floor(ordenados.length / 2);
    if (ordenados.length % 2 === 1) {
      return ordenados[medio];
    }
    return (ordenados[medio - 1] + ordenados[medio]) / 2;
  }
}
