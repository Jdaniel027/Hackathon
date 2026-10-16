import { Injectable, Logger } from '@nestjs/common';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { APP_ERRORS } from '../../common/exception/app-exception.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { OpenMeteoService } from '../open-meteo/open-meteo.service.js';
import { ConaguaService } from '../conagua/conagua.service.js';
import type { LluviaZona } from '../open-meteo/open-meteo.service.js';
import { calcularEstado, umbralesPara } from '../zonas/constants/umbrales.js';
import { M_POR_GRADO } from '../zonas/utils/geo.util.js';
import type { EstadoZonaApi } from '../zonas/zonas.types.js';
import type { Prisma } from '../../generated/prisma/client.js';
import { celdasBajasConectadas, mallaReporte } from './area-estimada.util.js';
import type { PuntoZona } from '../open-meteo/open-meteo.service.js';

export const NOMBRES_CRON = [
  'actualizarClima',
  'reevaluarReportes',
  'expirarRiesgos',
  'revisarCiclones',
] as const;

export type NombreCron = (typeof NOMBRES_CRON)[number];

export interface ResultadoCron {
  nombre: string;
  ejecutado: boolean;
  nota: string;
  detalle?: Record<string, unknown>;
}

// Orden de severidad para la histéresis (SIN_DATOS es "sin estado").
const SEVERIDAD: Record<EstadoZonaApi, number> = {
  SIN_DATOS: -1,
  NORMAL: 0,
  PRECAUCION: 1,
  INUNDADO: 2,
};

// Prolongación de un riesgo de inundación creado/renovado por evidencia (IDEA.md §2).
const PROLONGACION_RIESGO_MS = 3 * 24 * 60 * 60 * 1000; // 3 días
// Solo se reevalúan reportes recientes: los más viejos quedan como historial.
const VENTANA_REPORTES_MS = 24 * 60 * 60 * 1000; // 24 h
// Una lectura se considera "reciente" para corroborar (2 ciclos de actualizarClima).
const RECENCIA_LECTURA_MS = 60 * 60 * 1000; // 60 min
// Radio del riesgo derivado de un reporte corroborado.
const RADIO_RIESGO_INUNDACION_M = 500;
// Open-Meteo admite hasta 100 coordenadas por petición: se procesa por lotes.
const LOTE_ZONAS = 100;
const MAX_EDAD_PRONOSTICO_MS = 2 * 60 * 60 * 1000;
const ZONAS_HORARIAS_MX = [
  'America/Tijuana',
  'America/Hermosillo',
  'America/Mexico_City',
  'America/Cancun',
] as const;

// Zona con la relación de municipio que necesitan los jobs.
type ZonaConMunicipio = Prisma.ZonaGetPayload<{
  include: {
    municipio: { select: { slug: true; idEstadoSmn: true; idMunSmn: true } };
  };
}>;

type ReporteConZona = Prisma.ReporteGetPayload<{
  include: {
    zona: {
      include: { municipio: { select: { slug: true } } };
    };
  };
}>;

@Injectable()
export class CronsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CronsService.name);
  private readonly enCurso = new Map<NombreCron, Promise<ResultadoCron>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly openMeteo: OpenMeteoService,
    private readonly conagua: ConaguaService,
  ) {}

  onApplicationBootstrap(): void {
    // Las suites HTTP usan una BD compartida: nunca escribir al iniciar en NODE_ENV=test.
    if (process.env.NODE_ENV === 'test') return;
    void this.actualizarAlIniciar();
  }

  private async actualizarAlIniciar(): Promise<void> {
    // No bloquea el arranque HTTP; reevaluar después del primer clima evita usar datos viejos.
    await Promise.all([
      this.ejecutarSeguro('actualizarClima'),
      this.ejecutarSeguro('expirarRiesgos'),
    ]);
    await this.ejecutarSeguro('reevaluarReportes');
  }

  // Cada 15 minutos: Open-Meteo → Zona + LecturaClima.
  @Cron('0 */15 * * * *')
  async actualizarClima(): Promise<void> {
    await this.ejecutarSeguro('actualizarClima');
  }

  // Cada 10 minutos: recalcula CORROBORADO/PENDIENTE/NO_CORROBORADO.
  @Cron('0 */10 * * * *')
  async reevaluarReportes(): Promise<void> {
    await this.ejecutarSeguro('reevaluarReportes');
  }

  // Cada hora: desactiva ZonaRiesgo vencidas.
  @Cron('0 0 * * * *')
  async expirarRiesgos(): Promise<void> {
    await this.ejecutarSeguro('expirarRiesgos');
  }

  // Cada 3 horas: revisa ciclones.
  @Cron('0 0 */3 * * *')
  async revisarCiclones(): Promise<void> {
    await this.ejecutarSeguro('revisarCiclones');
  }

  // Dispara un cron a mano desde /admin/cron/:nombre (DEVELOPER_H).
  async ejecutar(nombre: string): Promise<ResultadoCron> {
    if (!this.esNombreValido(nombre)) {
      throw APP_ERRORS.CRON_DESCONOCIDO(nombre);
    }
    const actual = this.enCurso.get(nombre);
    if (actual) return actual;

    const trabajo = this.ejecutarTrabajo(nombre);
    this.enCurso.set(nombre, trabajo);
    try {
      return await trabajo;
    } finally {
      this.enCurso.delete(nombre);
    }
  }

  private ejecutarTrabajo(nombre: NombreCron): Promise<ResultadoCron> {
    switch (nombre) {
      case 'actualizarClima':
        return this.jobActualizarClima();
      case 'reevaluarReportes':
        return this.jobReevaluarReportes();
      case 'expirarRiesgos':
        return this.jobExpirarRiesgos();
      case 'revisarCiclones':
        return this.jobRevisarCiclones();
    }
  }

  // ─── actualizarClima ──────────────────────────────────────────────────────

  private async jobActualizarClima(): Promise<ResultadoCron> {
    const zonas = await this.prisma.zona.findMany({
      include: {
        municipio: {
          select: { slug: true, idEstadoSmn: true, idMunSmn: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    if (zonas.length === 0) {
      return {
        nombre: 'actualizarClima',
        ejecutado: true,
        nota: 'Sin zonas registradas; nada que actualizar.',
        detalle: { zonas: 0, actualizadas: 0 },
      };
    }

    let actualizadas = 0;
    let lotesFallidos = 0;

    for (let inicio = 0; inicio < zonas.length; inicio += LOTE_ZONAS) {
      const lote = zonas.slice(inicio, inicio + LOTE_ZONAS);

      let lluvias: LluviaZona[];
      try {
        lluvias = await this.openMeteo.getLluviaZonas(
          lote.map((zona) => ({
            latCentro: zona.latCentro,
            lngCentro: zona.lngCentro,
          })),
        );
      } catch (error) {
        // Proveedor caído: se conserva el último dato válido en BD para el lote.
        lotesFallidos += 1;
        this.logger.error(
          `Open-Meteo no disponible para un lote de ${lote.length} zonas; se conserva el último dato válido.`,
          error,
        );
        continue;
      }

      for (let i = 0; i < lote.length; i += 1) {
        const zona = lote[i];
        const lluvia = lluvias[i];
        if (!lluvia) {
          continue;
        }

        const estado = await this.resolverEstado(
          zona,
          lluvia.mm1h,
          lluvia.mm24h,
        );

        await this.prisma.$transaction([
          this.prisma.lecturaClima.create({
            data: {
              zonaId: zona.id,
              mm1h: lluvia.mm1h,
              mm24h: lluvia.mm24h,
              fuente: 'OPEN_METEO',
            },
          }),
          this.prisma.zona.update({
            where: { id: zona.id },
            data: {
              mm1h: lluvia.mm1h,
              mm24h: lluvia.mm24h,
              estado,
              latModelo: lluvia.latModelo,
              lngModelo: lluvia.lngModelo,
            },
          }),
        ]);
        actualizadas += 1;
      }
    }

    const conagua = await this.registrarApoyoConagua(zonas);

    this.logger.log(
      `actualizarClima: ${actualizadas}/${zonas.length} zonas actualizadas (lotes fallidos: ${lotesFallidos}, Conagua: ${conagua.lecturas}).`,
    );

    return {
      nombre: 'actualizarClima',
      ejecutado: actualizadas > 0 || lotesFallidos === 0,
      nota:
        `${actualizadas}/${zonas.length} zonas actualizadas con Open-Meteo.` +
        (lotesFallidos > 0
          ? ` ${lotesFallidos} lote(s) fallaron; se conserva el último dato.`
          : ''),
      detalle: { zonas: zonas.length, actualizadas, lotesFallidos, conagua },
    };
  }

  // Regla de estado con histéresis: subir es inmediato; bajar exige 2 lecturas
  // seguidas por debajo del estado actual (IDEA.md §6).
  private async resolverEstado(
    zona: ZonaConMunicipio,
    mm1h: number,
    mm24h: number,
  ): Promise<EstadoZonaApi> {
    const umbrales = umbralesPara(zona.municipio.slug);
    const objetivo = calcularEstado(mm1h, mm24h, umbrales);
    const actual = zona.estado as EstadoZonaApi;

    if (actual === 'SIN_DATOS' || SEVERIDAD[objetivo] >= SEVERIDAD[actual]) {
      return objetivo;
    }

    const previa = await this.prisma.lecturaClima.findFirst({
      where: { zonaId: zona.id, fuente: 'OPEN_METEO' },
      orderBy: { creadoEn: 'desc' },
    });
    if (!previa || previa.mm24h === null) {
      return actual;
    }

    const objetivoPrevio = calcularEstado(previa.mm1h, previa.mm24h, umbrales);
    return SEVERIDAD[objetivoPrevio] <= SEVERIDAD[objetivo] ? objetivo : actual;
  }

  private async registrarApoyoConagua(
    zonas: ZonaConMunicipio[],
  ): Promise<{ municipios: number; lecturas: number }> {
    const grupos = new Map<string, ZonaConMunicipio[]>();
    for (const zona of zonas) {
      const { idEstadoSmn, idMunSmn } = zona.municipio;
      if (idEstadoSmn == null || idMunSmn == null) continue;
      const clave = `${idEstadoSmn}:${idMunSmn}`;
      grupos.set(clave, [...(grupos.get(clave) ?? []), zona]);
    }
    if (!grupos.size) return { municipios: 0, lecturas: 0 };

    try {
      const ids = [...grupos.values()].map(([zona]) => ({
        idEstadoSmn: zona.municipio.idEstadoSmn!,
        idMunSmn: zona.municipio.idMunSmn!,
      }));
      const pronosticos = await this.conagua.getPronosticosPorHora(ids);
      let lecturas = 0;
      for (const [clave, zonasMunicipio] of grupos) {
        const horas = (pronosticos.get(clave) ?? [])
          .filter((dato) => dato.nhor >= 0)
          .sort((a, b) => a.nhor - b.nhor);
        if (
          !horas.length ||
          horas[0].nhor !== 0 ||
          !this.pronosticoVigente(horas[0].hloc)
        )
          continue;
        const mm1h = horas[0].prec;
        // Lectura horaria de apoyo en una zona representativa; NO modifica el estado de Zona.
        await this.prisma.lecturaClima.create({
          data: {
            zonaId: zonasMunicipio[0].id,
            mm1h,
            mm24h: null,
            fuente: 'CONAGUA',
          },
        });
        lecturas += 1;
      }
      return { municipios: grupos.size, lecturas };
    } catch (error) {
      this.logger.warn(
        'Conagua no disponible; se conservan las lecturas anteriores.',
        error,
      );
      return { municipios: grupos.size, lecturas: 0 };
    }
  }

  // ─── reevaluarReportes ────────────────────────────────────────────────────

  private async jobReevaluarReportes(): Promise<ResultadoCron> {
    const desde = new Date(Date.now() - VENTANA_REPORTES_MS);
    const pendientes = await this.prisma.reporte.findMany({
      where: { tipo: 'PENDIENTE', creadoEn: { gte: desde } },
      include: { zona: { include: { municipio: { select: { slug: true } } } } },
      orderBy: { creadoEn: 'asc' },
    });

    let corroborados = 0;
    let noCorroborados = 0;
    let sinLectura = 0;
    let riesgosCreados = 0;
    let riesgosRenovados = 0;

    for (const reporte of pendientes) {
      const lectura = await this.ultimaLecturaReciente(reporte.zonaId);
      if (!lectura || lectura.mm24h === null) {
        sinLectura += 1;
        continue;
      }

      const clasificacion = reporte.clasificacion;
      const umbrales = umbralesPara(reporte.zona.municipio.slug);
      const superaUmbral =
        lectura.mm1h >= umbrales.precaucionMm1h ||
        lectura.mm24h >= umbrales.precaucionMm24h;

      if (
        (clasificacion === 'INUNDADO' || clasificacion === 'PARCIAL') &&
        superaUmbral
      ) {
        await this.prisma.reporte.update({
          where: { id: reporte.id },
          data: { tipo: 'CORROBORADO' },
        });
        const accion = await this.crearORenovarRiesgo(reporte);
        riesgosCreados += accion.creados;
        riesgosRenovados += accion.renovados;
        corroborados += 1;
      } else if (clasificacion === 'INUNDADO' && !superaUmbral) {
        await this.prisma.reporte.update({
          where: { id: reporte.id },
          data: { tipo: 'NO_CORROBORADO' },
        });
        noCorroborados += 1;
      } else {
        // Foto sin inundación o datos insuficientes: se mantiene PENDIENTE.
        sinLectura += 1;
      }
    }

    this.logger.log(
      `reevaluarReportes: ${corroborados} corroborados, ${noCorroborados} no corroborados, ${sinLectura} sin cambios.`,
    );

    return {
      nombre: 'reevaluarReportes',
      ejecutado: true,
      nota: `${corroborados} corroborados, ${noCorroborados} no corroborados, ${sinLectura} pendientes.`,
      detalle: {
        evaluados: pendientes.length,
        corroborados,
        noCorroborados,
        sinCambios: sinLectura,
        riesgosCreados,
        riesgosRenovados,
      },
    };
  }

  private async ultimaLecturaReciente(zonaId: number) {
    const lectura = await this.prisma.lecturaClima.findFirst({
      where: { zonaId, fuente: 'OPEN_METEO' },
      orderBy: { creadoEn: 'desc' },
    });
    if (!lectura) {
      return null;
    }
    const edadMs = Date.now() - lectura.creadoEn.getTime();
    return edadMs <= RECENCIA_LECTURA_MS ? lectura : null;
  }

  // Crea o renueva un ZonaRiesgo de inundación por evidencia (IDEA.md §6).
  private async crearORenovarRiesgo(
    reporte: ReporteConZona,
  ): Promise<{ creados: number; renovados: number }> {
    const lat = reporte.userLat ?? reporte.zona.latCentro;
    const lng = reporte.userLng ?? reporte.zona.lngCentro;
    const venceEn = new Date(Date.now() + PROLONGACION_RIESGO_MS);
    let puntos: PuntoZona[] = [{ latCentro: lat, lngCentro: lng }];
    try {
      const celdas = mallaReporte(reporte.zona, lat, lng);
      const elevaciones = await this.openMeteo.getElevaciones(
        celdas.map((celda) => celda.punto),
      );
      puntos = celdasBajasConectadas(celdas, elevaciones);
    } catch {
      // Fallo del DEM: conserva la corroboración y el riesgo puntual existente.
      this.logger.warn(
        `Elevación no disponible para reporte ${reporte.id}; se conserva riesgo puntual.`,
      );
    }

    const activos = await this.prisma.zonaRiesgo.findMany({
      where: {
        municipioId: reporte.zona.municipioId,
        motivo: 'INUNDACION',
        origen: 'CLIMA',
        activa: true,
      },
    });

    // Un reporte se representa con un solo círculo centrado en el usuario.
    // El radio cubre la extensión de las celdas bajas conectadas, no toda la celda de 9 km.
    const radioEstimado = Math.max(
      RADIO_RIESGO_INUNDACION_M,
      Math.ceil(
        Math.max(
          ...puntos.map((punto) =>
            this.distanciaM(lat, lng, punto.latCentro, punto.lngCentro),
          ),
        ) + RADIO_RIESGO_INUNDACION_M,
      ),
    );
    const existente = activos.find(
      (riesgo) =>
        this.distanciaM(lat, lng, riesgo.lat, riesgo.lng) <= riesgo.radioM,
    );
    let creados = 0;
    let renovados = 0;
    if (existente) {
      await this.prisma.zonaRiesgo.update({
        where: { id: existente.id },
        data: { lat, lng, radioM: radioEstimado, venceEn },
      });
      renovados = 1;
    } else {
      await this.prisma.zonaRiesgo.create({
        data: {
          municipioId: reporte.zona.municipioId,
          lat,
          lng,
          radioM: radioEstimado,
          motivo: 'INUNDACION',
          origen: 'CLIMA',
          venceEn,
        },
      });
      creados = 1;
    }
    return { creados, renovados };
  }

  // ─── expirarRiesgos ───────────────────────────────────────────────────────

  private async jobExpirarRiesgos(): Promise<ResultadoCron> {
    const resultado = await this.prisma.zonaRiesgo.updateMany({
      where: {
        motivo: 'INUNDACION',
        activa: true,
        venceEn: { lt: new Date() },
      },
      data: { activa: false },
    });

    this.logger.log(`expirarRiesgos: ${resultado.count} riesgos desactivados.`);

    return {
      nombre: 'expirarRiesgos',
      ejecutado: true,
      nota: `${resultado.count} riesgos de inundación vencidos desactivados.`,
      detalle: { expirados: resultado.count },
    };
  }

  // ─── revisarCiclones ──────────────────────────────────────────────────────

  private async jobRevisarCiclones(): Promise<ResultadoCron> {
    // No hay API JSON de ciclones confirmada (API_MANUAL.md §5.3). Plan B:
    // registro manual vía POST /admin/ciclon (expuesto por DEVELOPER_H).
    // No se inventan datos: este cron no persiste nada por ahora.
    this.logger.debug(
      'revisarCiclones: sin fuente de ciclones; usar POST /admin/ciclon (Plan B).',
    );
    return {
      nombre: 'revisarCiclones',
      ejecutado: false,
      nota: 'Sin fuente de ciclones confirmada; usar POST /admin/ciclon (Plan B).',
    };
  }

  // ─── utilidades ───────────────────────────────────────────────────────────

  private pronosticoVigente(hloc: string): boolean {
    if (!/^\d{8}T\d{2}$/.test(hloc)) return false;
    const horaPronostico = Date.UTC(
      Number(hloc.slice(0, 4)),
      Number(hloc.slice(4, 6)) - 1,
      Number(hloc.slice(6, 8)),
      Number(hloc.slice(9, 11)),
    );
    return ZONAS_HORARIAS_MX.some((timeZone) => {
      const formateador = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hourCycle: 'h23',
      });
      const partes = Object.fromEntries(
        formateador
          .formatToParts(new Date())
          .map(({ type, value }) => [type, value]),
      );
      const horaLocal = Date.UTC(
        Number(partes.year),
        Number(partes.month) - 1,
        Number(partes.day),
        Number(partes.hour),
      );
      return Math.abs(horaLocal - horaPronostico) <= MAX_EDAD_PRONOSTICO_MS;
    });
  }

  private distanciaM(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const dLat = (lat2 - lat1) * M_POR_GRADO;
    const dLng =
      (lng2 - lng1) *
      M_POR_GRADO *
      Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
    return Math.hypot(dLat, dLng);
  }

  private async ejecutarSeguro(nombre: NombreCron): Promise<void> {
    try {
      await this.ejecutar(nombre);
    } catch (error) {
      this.logger.error(`Cron "${nombre}" falló.`, error);
    }
  }

  private esNombreValido(nombre: string): nombre is NombreCron {
    return (NOMBRES_CRON as readonly string[]).includes(nombre);
  }
}
