import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service.js';
import { UbicacionService } from '../ubicacion/ubicacion.service.js';
import { APP_ERRORS } from '../../common/exception/app-exception.js';
import { calcularEstado, umbralesPara } from './constants/umbrales.js';
import { contiene, M_POR_GRADO } from './utils/geo.util.js';
import type { Coordenada } from './utils/geo.util.js';
import type {
  MapaResponse,
  ZonaDetalle,
  ZonaMapa,
  ZonaRiesgoMapa,
} from './zonas.types.js';
import type { EstadoZona, FuenteClima } from '../../generated/prisma/enums.js';

const LADO_DEFECTO_M = 9000;
const LECTURAS_POR_DEFECTO = 25;
const MAX_ZONAS_POR_GENERACION = 500;

@Injectable()
export class ZonasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ubicacion: UbicacionService,
  ) {}

  async getMapa(municipioSlug: string): Promise<MapaResponse> {
    const municipio =
      await this.ubicacion.buscarMunicipioPorSlug(municipioSlug);

    const zonas = await this.prisma.zona.findMany({
      where: { municipioId: municipio.id },
      orderBy: { id: 'asc' },
    });
    const riesgos = await this.prisma.zonaRiesgo.findMany({
      where: { municipioId: municipio.id, activa: true },
      orderBy: { id: 'asc' },
    });

    const actualizadoEn =
      zonas.length > 0
        ? new Date(
            Math.max(...zonas.map((zona) => zona.actualizadoEn.getTime())),
          ).toISOString()
        : new Date().toISOString();

    return {
      municipio: municipio.slug,
      actualizadoEn,
      zonas: zonas.map((zona) => this.aZonaMapa(zona)),
      zonasRiesgo: riesgos.map((riesgo) => this.aZonaRiesgoMapa(riesgo)),
    };
  }

  async getZona(id: number): Promise<ZonaDetalle> {
    const zona = await this.prisma.zona.findUnique({
      where: { id },
      include: {
        municipio: { select: { slug: true } },
        lecturas: { orderBy: { creadoEn: 'desc' }, take: LECTURAS_POR_DEFECTO },
      },
    });
    if (!zona) {
      throw APP_ERRORS.ZONA_NO_ENCONTRADA(id);
    }

    return {
      ...this.aZonaMapa(zona),
      municipioSlug: zona.municipio.slug,
      lecturas: zona.lecturas.map((lectura) => ({
        id: lectura.id,
        mm1h: lectura.mm1h,
        mm24h: lectura.mm24h,
        fuente: lectura.fuente as FuenteClima,
        creadoEn: lectura.creadoEn.toISOString(),
      })),
    };
  }

  // Reportes: busca la zona (de cualquier municipio) que contiene el punto dado.
  async buscarZonaPorPunto(lat: number, lng: number) {
    const zonas = await this.prisma.zona.findMany({ orderBy: { id: 'asc' } });
    return (
      zonas.find((zona) =>
        contiene(
          {
            latCentro: zona.latCentro,
            lngCentro: zona.lngCentro,
            ladoM: zona.ladoM,
          },
          lat,
          lng,
        ),
      ) ?? null
    );
  }

  // Admin/demo: fija mm1h/mm24h de una zona y registra la lectura.
  async simularLluvia(
    zonaId: number,
    mm1h: number,
    mm24h: number,
  ): Promise<ZonaMapa> {
    const zona = await this.prisma.zona.findUnique({
      where: { id: zonaId },
      include: { municipio: { select: { slug: true } } },
    });
    if (!zona) {
      throw APP_ERRORS.ZONA_NO_ENCONTRADA(zonaId);
    }

    const estado = calcularEstado(
      mm1h,
      mm24h,
      umbralesPara(zona.municipio.slug),
    );

    const actualizada = await this.prisma.$transaction(async (tx) => {
      await tx.lecturaClima.create({
        data: { zonaId, mm1h, mm24h, fuente: 'OPEN_METEO' },
      });
      return tx.zona.update({
        where: { id: zonaId },
        data: { mm1h, mm24h, estado },
      });
    });

    return this.aZonaMapa(actualizada);
  }

  // Admin: genera la malla de zonas (cuadros de ~9 km) dentro de un bounding box.
  async generarZonas(
    municipioSlug: string,
    sw: Coordenada,
    ne: Coordenada,
    ladoM: number = LADO_DEFECTO_M,
  ): Promise<{ creadas: number }> {
    const [swLat, swLng] = sw;
    const [neLat, neLng] = ne;
    if (
      swLat >= neLat ||
      swLng >= neLng ||
      !Number.isFinite(ladoM) ||
      ladoM <= 0
    ) {
      throw new BadRequestException(
        'Los límites sw/ne o el tamaño de celda no son válidos.',
      );
    }

    const centroLat = (swLat + neLat) / 2;
    const dLat = ladoM / M_POR_GRADO;
    const dLng = ladoM / (M_POR_GRADO * Math.cos((centroLat * Math.PI) / 180));
    if (
      Math.ceil((neLat - swLat) / dLat) * Math.ceil((neLng - swLng) / dLng) >
      MAX_ZONAS_POR_GENERACION
    ) {
      throw new BadRequestException(
        'El área supera el máximo de 500 zonas por operación.',
      );
    }

    const municipio =
      await this.ubicacion.buscarMunicipioPorSlug(municipioSlug);

    const centros: { latCentro: number; lngCentro: number }[] = [];
    for (let lat = swLat + dLat / 2; lat <= neLat; lat += dLat) {
      for (let lng = swLng + dLng / 2; lng <= neLng; lng += dLng) {
        centros.push({
          latCentro: Number(lat.toFixed(6)),
          lngCentro: Number(lng.toFixed(6)),
        });
      }
    }

    if (centros.length === 0) {
      return { creadas: 0 };
    }

    const resultado = await this.prisma.zona.createMany({
      data: centros.map((centro) => ({
        municipioId: municipio.id,
        ladoM,
        ...centro,
      })),
      skipDuplicates: true,
    });

    return { creadas: resultado.count };
  }

  private aZonaMapa(zona: {
    id: number;
    latCentro: number;
    lngCentro: number;
    ladoM: number;
    estado: EstadoZona;
    mm1h: number;
    mm24h: number;
  }): ZonaMapa {
    return {
      id: zona.id,
      latCentro: zona.latCentro,
      lngCentro: zona.lngCentro,
      ladoM: zona.ladoM,
      estado: zona.estado,
      mm1h: zona.mm1h,
      mm24h: zona.mm24h,
    };
  }

  private aZonaRiesgoMapa(riesgo: {
    id: number;
    lat: number;
    lng: number;
    radioM: number;
    motivo: string;
    origen: string;
    venceEn: Date | null;
  }): ZonaRiesgoMapa {
    return {
      id: riesgo.id,
      lat: riesgo.lat,
      lng: riesgo.lng,
      radioM: riesgo.radioM,
      motivo: riesgo.motivo as ZonaRiesgoMapa['motivo'],
      origen: riesgo.origen as ZonaRiesgoMapa['origen'],
      venceEn: riesgo.venceEn ? riesgo.venceEn.toISOString() : null,
    };
  }
}
