import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import type { PrismaService } from '../../prisma/prisma.service.js';
import type { OpenMeteoService } from '../open-meteo/open-meteo.service.js';
import { CronsService, NOMBRES_CRON } from './crons.service.js';

// Mazatlán no tiene umbrales propios → se usan los por defecto:
// precaución 20 mm/h | 50 mm/24h; inundado 40 mm/h | 100 mm/24h.
const UMBRAL_INUNDADO_MM1H = 45;
const UMBRAL_PRECAUCION_MM1H = 25;

type Mocks = {
  zonaFindMany: Mock;
  zonaUpdate: Mock;
  lecturaCreate: Mock;
  lecturaFindFirst: Mock;
  transaccion: Mock;
  reporteFindMany: Mock;
  reporteUpdate: Mock;
  riesgoFindMany: Mock;
  riesgoCreate: Mock;
  riesgoUpdate: Mock;
  riesgoUpdateMany: Mock;
  getLluviaZonas: Mock;
};

function zona(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 1,
    municipioId: 1,
    latCentro: 23.2494,
    lngCentro: -106.4111,
    estado: 'SIN_DATOS',
    mm1h: 0,
    mm24h: 0,
    municipio: { slug: 'mazatlan' },
    ...overrides,
  };
}

function reporte(overrides: Record<string, unknown> = {}, zonaOverrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 10,
    zonaId: 1,
    tipo: 'PENDIENTE',
    clasificacion: 'INUNDADO',
    userLat: 23.2494,
    userLng: -106.4111,
    creadoEn: new Date(),
    zona: zona({ id: 1, ...zonaOverrides }),
    ...overrides,
  };
}

function lluvia(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    latCentro: 23.2494,
    lngCentro: -106.4111,
    mm1h: UMBRAL_INUNDADO_MM1H,
    mm24h: 120,
    latModelo: 23.25,
    lngModelo: -106.41,
    ...overrides,
  };
}

function datosUpdate(mock: Mock): Record<string, unknown> {
  return mock.mock.calls[0][0].data as Record<string, unknown>;
}

function consulta(mock: Mock, indice = 0): Record<string, unknown> {
  return mock.mock.calls[indice][0] as Record<string, unknown>;
}

describe('CronsService', () => {
  let m: Mocks;
  let crons: CronsService;

  beforeEach(() => {
    m = {
      zonaFindMany: vi.fn(),
      zonaUpdate: vi.fn().mockResolvedValue({}),
      lecturaCreate: vi.fn().mockResolvedValue({}),
      lecturaFindFirst: vi.fn().mockResolvedValue(null),
      transaccion: vi.fn().mockResolvedValue([{}, {}]),
      reporteFindMany: vi.fn().mockResolvedValue([]),
      reporteUpdate: vi.fn().mockResolvedValue({}),
      riesgoFindMany: vi.fn().mockResolvedValue([]),
      riesgoCreate: vi.fn().mockResolvedValue({}),
      riesgoUpdate: vi.fn().mockResolvedValue({}),
      riesgoUpdateMany: vi.fn().mockResolvedValue({ count: 0 }),
      getLluviaZonas: vi.fn().mockResolvedValue([]),
    };

    const prisma = {
      zona: { findMany: m.zonaFindMany, update: m.zonaUpdate },
      lecturaClima: { create: m.lecturaCreate, findFirst: m.lecturaFindFirst },
      $transaction: m.transaccion,
      reporte: { findMany: m.reporteFindMany, update: m.reporteUpdate },
      zonaRiesgo: {
        findMany: m.riesgoFindMany,
        create: m.riesgoCreate,
        update: m.riesgoUpdate,
        updateMany: m.riesgoUpdateMany,
      },
    } as unknown as PrismaService;

    const openMeteo = { getLluviaZonas: m.getLluviaZonas } as unknown as OpenMeteoService;

    crons = new CronsService(prisma, openMeteo);
  });

  describe('ejecutar (disparo manual desde /admin/cron/:nombre)', () => {
    it('rechaza con 400 un nombre fuera de la lista', async () => {
      await expect(crons.ejecutar('otro')).rejects.toMatchObject({
        status: 400,
        response: { code: 'CRON_DESCONOCIDO' },
      });
      expect(m.zonaFindMany).not.toHaveBeenCalled();
      expect(m.reporteFindMany).not.toHaveBeenCalled();
    });

    it('enruta a los cuatro crons declarados', async () => {
      m.zonaFindMany.mockResolvedValue([]);
      m.riesgoUpdateMany.mockResolvedValue({ count: 0 });

      for (const nombre of NOMBRES_CRON) {
        const resultado = await crons.ejecutar(nombre);
        expect(resultado.nombre).toBe(nombre);
      }
    });
  });

  describe('actualizarClima', () => {
    it('sin zonas registradas termina bien y no consulta al proveedor', async () => {
      m.zonaFindMany.mockResolvedValue([]);

      const resultado = await crons.ejecutar('actualizarClima');

      expect(resultado).toMatchObject({
        nombre: 'actualizarClima',
        ejecutado: true,
        detalle: { zonas: 0, actualizadas: 0 },
      });
      expect(m.getLluviaZonas).not.toHaveBeenCalled();
    });

    it('consulta por zona y persiste lectura + estado en una transacción', async () => {
      m.zonaFindMany.mockResolvedValue([zona({ estado: 'SIN_DATOS' })]);
      m.getLluviaZonas.mockResolvedValue([lluvia()]);

      const resultado = await crons.ejecutar('actualizarClima');

      expect(m.getLluviaZonas).toHaveBeenCalledWith([
        { latCentro: 23.2494, lngCentro: -106.4111 },
      ]);
      expect(m.zonaFindMany).toHaveBeenCalledWith({
        include: { municipio: { select: { slug: true } } },
        orderBy: { id: 'asc' },
      });
      expect(m.transaccion).toHaveBeenCalledTimes(1);
      expect(datosUpdate(m.lecturaCreate)).toMatchObject({
        zonaId: 1,
        mm1h: UMBRAL_INUNDADO_MM1H,
        mm24h: 120,
        fuente: 'OPEN_METEO',
      });
      expect(datosUpdate(m.zonaUpdate)).toMatchObject({
        mm1h: UMBRAL_INUNDADO_MM1H,
        estado: 'INUNDADO',
        latModelo: 23.25,
        lngModelo: -106.41,
      });
      expect(resultado).toMatchObject({
        ejecutado: true,
        detalle: { zonas: 1, actualizadas: 1, lotesFallidos: 0 },
      });
    });

    it('parte en lotes de 100 coordenadas (límite de Open-Meteo)', async () => {
      const zonas = Array.from({ length: 250 }, (_, i) =>
        zona({ id: i + 1, latCentro: 23 + i / 1000, estado: 'SIN_DATOS' }),
      );
      m.zonaFindMany.mockResolvedValue(zonas);
      m.getLluviaZonas.mockResolvedValue(Array.from({ length: 100 }, () => lluvia()));

      const resultado = await crons.ejecutar('actualizarClima');

      expect(m.getLluviaZonas).toHaveBeenCalledTimes(3);
      expect(m.getLluviaZonas.mock.calls.map((c) => (c[0] as unknown[]).length)).toEqual([
        100, 100, 50,
      ]);
      expect(resultado.detalle).toMatchObject({ zonas: 250, actualizadas: 250 });
    });

    it('devuelve ejecutado:false cuando ningún lote pudo leerse', async () => {
      m.zonaFindMany.mockResolvedValue([zona()]);
      m.getLluviaZonas.mockRejectedValue(new Error('proveedor caído'));

      const resultado = await crons.ejecutar('actualizarClima');

      expect(resultado).toMatchObject({
        ejecutado: false,
        detalle: { lotesFallidos: 1, actualizadas: 0 },
      });
      expect(m.transaccion).not.toHaveBeenCalled();
      expect(m.lecturaCreate).not.toHaveBeenCalled();
    });

    it('aisla el fallo de un lote sin frenar a los demás', async () => {
      const zonas = Array.from({ length: 200 }, (_, i) => zona({ id: i + 1 }));
      m.zonaFindMany.mockResolvedValue(zonas);
      m.getLluviaZonas
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValue(Array.from({ length: 100 }, () => lluvia()));

      const resultado = await crons.ejecutar('actualizarClima');

      expect(resultado).toMatchObject({
        ejecutado: true,
        detalle: { zonas: 200, actualizadas: 100, lotesFallidos: 1 },
      });
      expect(m.lecturaCreate).toHaveBeenCalledTimes(100);
    });

    it('sube de estado de inmediato sin mirar lecturas previas', async () => {
      m.zonaFindMany.mockResolvedValue([zona({ estado: 'NORMAL' })]);
      m.getLluviaZonas.mockResolvedValue([lluvia()]);

      await crons.ejecutar('actualizarClima');

      expect(datosUpdate(m.zonaUpdate).estado).toBe('INUNDADO');
      expect(m.lecturaFindFirst).not.toHaveBeenCalled();
    });

    it('SIN_DATOS adopta el estado calculado sin histéresis', async () => {
      m.zonaFindMany.mockResolvedValue([zona({ estado: 'SIN_DATOS' })]);
      m.getLluviaZonas.mockResolvedValue([
        lluvia({ mm1h: UMBRAL_PRECAUCION_MM1H, mm24h: 30 }),
      ]);

      await crons.ejecutar('actualizarClima');

      expect(datosUpdate(m.zonaUpdate).estado).toBe('PRECAUCION');
      expect(m.lecturaFindFirst).not.toHaveBeenCalled();
    });

    it('no baja de INUNDADO si aún no hay lectura previa', async () => {
      m.zonaFindMany.mockResolvedValue([zona({ estado: 'INUNDADO' })]);
      m.getLluviaZonas.mockResolvedValue([lluvia({ mm1h: 0, mm24h: 0 })]);
      m.lecturaFindFirst.mockResolvedValue(null);

      await crons.ejecutar('actualizarClima');

      expect(datosUpdate(m.zonaUpdate).estado).toBe('INUNDADO');
      expect(m.lecturaFindFirst).toHaveBeenCalledWith({
        where: { zonaId: 1 },
        orderBy: { creadoEn: 'desc' },
      });
    });

    it('baja a NORMAL cuando la lectura previa también estaba baja', async () => {
      m.zonaFindMany.mockResolvedValue([zona({ estado: 'INUNDADO' })]);
      m.getLluviaZonas.mockResolvedValue([lluvia({ mm1h: 0, mm24h: 0 })]);
      m.lecturaFindFirst.mockResolvedValue({ mm1h: 5, mm24h: 10 });

      await crons.ejecutar('actualizarClima');

      expect(datosUpdate(m.zonaUpdate).estado).toBe('NORMAL');
    });

    it('mantiene INUNDADO si la lectura previa seguía alta', async () => {
      m.zonaFindMany.mockResolvedValue([zona({ estado: 'INUNDADO' })]);
      m.getLluviaZonas.mockResolvedValue([lluvia({ mm1h: 0, mm24h: 0 })]);
      m.lecturaFindFirst.mockResolvedValue({ mm1h: 50, mm24h: 130 });

      await crons.ejecutar('actualizarClima');

      expect(datosUpdate(m.zonaUpdate).estado).toBe('INUNDADO');
    });

    it('reporta el resultado del apoyo de Conagua', async () => {
      m.zonaFindMany.mockResolvedValue([zona()]);
      m.getLluviaZonas.mockResolvedValue([lluvia()]);

      const resultado = await crons.ejecutar('actualizarClima');

      // Fase 4 pendiente: aún no hay lecturas de apoyo, pero se deja el hueco.
      expect(resultado.detalle?.conagua).toEqual({ municipios: 0, lecturas: 0 });
    });
  });

  describe('reevaluarReportes', () => {
    beforeEach(() => {
      m.reporteFindMany.mockResolvedValue([reporte()]);
      m.lecturaFindFirst.mockResolvedValue({ mm1h: 50, mm24h: 130, creadoEn: new Date() });
    });

    it('solo evalúa PENDIENTE de las últimas 24 horas', async () => {
      await crons.ejecutar('reevaluarReportes');

      const where = consulta(m.reporteFindMany).where as {
        tipo: string;
        creadoEn: { gte: Date };
      };
      expect(where.tipo).toBe('PENDIENTE');
      expect(where.creadoEn.gte).toBeInstanceOf(Date);
      expect(Date.now() - where.creadoEn.gte.getTime()).toBeLessThanOrEqual(
        24 * 60 * 60 * 1000 + 5000,
      );
      expect(consulta(m.reporteFindMany).include).toEqual({
        zona: { include: { municipio: { select: { slug: true } } } },
      });
    });

    it('corrobora una foto de inundación con lluvia que supera umbral', async () => {
      m.riesgoFindMany.mockResolvedValue([]);

      const resultado = await crons.ejecutar('reevaluarReportes');

      expect(m.reporteUpdate).toHaveBeenCalledTimes(1);
      expect(datosUpdate(m.reporteUpdate).tipo).toBe('CORROBORADO');
      expect(datosUpdate(m.riesgoCreate)).toMatchObject({
        municipioId: 1,
        radioM: 500,
        motivo: 'INUNDACION',
        origen: 'CLIMA',
        venceEn: expect.any(Date) as unknown as Date,
      });
      expect(resultado.detalle).toMatchObject({
        corroborados: 1,
        riesgosCreados: 1,
        riesgosRenovados: 0,
      });

      const venceEn = datosUpdate(m.riesgoCreate).venceEn as Date;
      const esperado = Date.now() + 3 * 24 * 60 * 60 * 1000;
      expect(Math.abs(venceEn.getTime() - esperado)).toBeLessThan(5000);
    });

    it('corrobora también una foto de PRECAUCION', async () => {
      m.reporteFindMany.mockResolvedValue([reporte({ clasificacion: 'PARCIAL' })]);

      await crons.ejecutar('reevaluarReportes');

      expect(datosUpdate(m.reporteUpdate).tipo).toBe('CORROBORADO');
    });

    it('renueva el riesgo activo cercano en vez de duplicarlo', async () => {
      m.riesgoFindMany.mockResolvedValue([
        { id: 9, lat: 23.2494, lng: -106.4111, radioM: 500 },
      ]);

      const resultado = await crons.ejecutar('reevaluarReportes');

      expect(m.riesgoCreate).not.toHaveBeenCalled();
      expect(m.riesgoUpdate).toHaveBeenCalledTimes(1);
      expect(m.riesgoUpdate.mock.calls[0][0]).toMatchObject({ where: { id: 9 } });
      expect(datosUpdate(m.riesgoUpdate).venceEn).toBeInstanceOf(Date);
      expect(resultado.detalle).toMatchObject({ riesgosCreados: 0, riesgosRenovados: 1 });
    });

    it('marca NO_CORROBORADO si la lluvia medida no supera el umbral', async () => {
      m.lecturaFindFirst.mockResolvedValue({ mm1h: 0, mm24h: 0, creadoEn: new Date() });

      const resultado = await crons.ejecutar('reevaluarReportes');

      expect(datosUpdate(m.reporteUpdate).tipo).toBe('NO_CORROBORADO');
      expect(m.riesgoCreate).not.toHaveBeenCalled();
      expect(resultado.detalle).toMatchObject({ noCorroborados: 1, corroborados: 0 });
    });

    it('no corrobora sin lectura climática reciente', async () => {
      m.lecturaFindFirst.mockResolvedValue(null);

      const resultado = await crons.ejecutar('reevaluarReportes');

      expect(m.reporteUpdate).not.toHaveBeenCalled();
      expect(m.riesgoCreate).not.toHaveBeenCalled();
      expect(resultado.detalle).toMatchObject({ sinCambios: 1 });
    });

    it('ignora una lectura con más de 60 minutos de antigüedad', async () => {
      m.lecturaFindFirst.mockResolvedValue({
        mm1h: 50,
        mm24h: 130,
        creadoEn: new Date(Date.now() - 90 * 60 * 1000),
      });

      const resultado = await crons.ejecutar('reevaluarReportes');

      expect(m.reporteUpdate).not.toHaveBeenCalled();
      expect(resultado.detalle).toMatchObject({ sinCambios: 1 });
    });

    it('mantiene PENDIENTE una foto sin inundación', async () => {
      m.reporteFindMany.mockResolvedValue([reporte({ clasificacion: 'NO_INUNDADO' })]);

      const resultado = await crons.ejecutar('reevaluarReportes');

      expect(m.reporteUpdate).not.toHaveBeenCalled();
      expect(resultado.detalle).toMatchObject({ sinCambios: 1 });
    });

    it('mantiene PENDIENTE un reporte sin clasificación', async () => {
      m.reporteFindMany.mockResolvedValue([reporte({ clasificacion: null })]);

      await crons.ejecutar('reevaluarReportes');

      expect(m.reporteUpdate).not.toHaveBeenCalled();
    });

    it('ejecuta aunque no haya reportes pendientes', async () => {
      m.reporteFindMany.mockResolvedValue([]);

      const resultado = await crons.ejecutar('reevaluarReportes');

      expect(resultado).toMatchObject({ ejecutado: true, detalle: { evaluados: 0 } });
      expect(m.lecturaFindFirst).not.toHaveBeenCalled();
    });
  });

  describe('expirarRiesgos', () => {
    it('desactiva los riesgos de inundación vencidos', async () => {
      m.riesgoUpdateMany.mockResolvedValue({ count: 3 });

      const resultado = await crons.ejecutar('expirarRiesgos');

      const where = consulta(m.riesgoUpdateMany).where as {
        motivo: string;
        activa: boolean;
        venceEn: { lt: Date };
      };
      expect(where.motivo).toBe('INUNDACION');
      expect(where.activa).toBe(true);
      expect(where.venceEn.lt).toBeInstanceOf(Date);
      expect(consulta(m.riesgoUpdateMany).data).toEqual({ activa: false });
      expect(resultado).toMatchObject({
        ejecutado: true,
        detalle: { expirados: 3 },
      });
    });

    it('ejecuta con cero riesgos vencidos', async () => {
      const resultado = await crons.ejecutar('expirarRiesgos');
      expect(resultado.detalle).toEqual({ expirados: 0 });
    });
  });

  describe('revisarCiclones', () => {
    it('no inventa datos: queda a la espera del registro manual', async () => {
      const resultado = await crons.ejecutar('revisarCiclones');

      expect(resultado).toMatchObject({
        nombre: 'revisarCiclones',
        ejecutado: false,
      });
      expect(resultado.nota).toContain('POST /admin/ciclon');
      expect(m.zonaFindMany).not.toHaveBeenCalled();
      expect(m.reporteFindMany).not.toHaveBeenCalled();
      expect(m.riesgoCreate).not.toHaveBeenCalled();
    });
  });
});
