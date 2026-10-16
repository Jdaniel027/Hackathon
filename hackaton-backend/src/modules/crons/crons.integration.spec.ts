import 'reflect-metadata';
import { config as cargarEnv } from 'dotenv';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { configurarApp } from '../../bootstrap/configurar-app.js';
import { ApiKeyGuard } from '../../common/guards/api-key.guard.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AdminController } from '../admin/admin.controller.js';
import { AdminService } from '../admin/admin.service.js';
import { OpenMeteoService } from '../open-meteo/open-meteo.service.js';
import { ZonasModule } from '../zonas/zonas.module.js';
import { CronsModule } from './crons.module.js';
import { CronsService } from './crons.service.js';

cargarEnv({ quiet: true });

// Punto de prueba aislado (aguas del Pacífico) para no chocar con el seed.
const LAT = 13.25;
const LNG = -93.5;
const MODELO = 'ecmwf_ifs';
const CLAVE_ADMIN = 'clave-de-integrracion-admin-0123456789';

const HAY_BD = Boolean(process.env.DATABASE_URL);

const LLUVIA_ALTA = { mm1h: 45, mm24h: 120, latModelo: 13.26, lngModelo: -93.49 };

const getLluviaZonas = vi.fn();

// Mismo objeto para el módulo raíz (lo inyecta AdminService) y para el grafo de
// CronsModule (lo inyecta CronsService): así no queda ninguna instancia real.
const openMeteoSimulado = { getLluviaZonas, getElevaciones: vi.fn() };

// `actualizarClima` recorre TODAS las zonas de la base. El simulador devuelve
// datos solo para el punto de esta suite y `undefined` para el resto, de modo
// que el cron no escribe nada sobre las zonas del seed (que quedarían con el
// último dato válido, que es justo el comportamiento ante un hueco de datos).
function simularSoloMiZona(puntos: Array<{ latCentro: number; lngCentro: number }>) {
  return Promise.resolve(
    puntos.map((punto) =>
      punto.latCentro === LAT && punto.lngCentro === LNG
        ? LLUVIA_ALTA
        : (undefined as unknown as typeof LLUVIA_ALTA),
    ),
  );
}

describe.skipIf(!HAY_BD)('crons contra PostgreSQL real (capa Admin)', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let crons: CronsService;
  let zonaId: number;
  let municipioId: number;
  let paisId: number;
  let estadoId: number;

  const sufijo = `it-cron-${Date.now().toString(36)}`;

  async function limpiarDatos(): Promise<void> {
    await prisma.zonaRiesgo.deleteMany({ where: { municipioId } });
    await prisma.reporte.deleteMany({ where: { zonaId } });
    await prisma.lecturaClima.deleteMany({ where: { zonaId } });
    await prisma.zona.update({
      where: { id: zonaId },
      data: { estado: 'SIN_DATOS', mm1h: 0, mm24h: 0, latModelo: null, lngModelo: null },
    });
  }

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [
        PrismaModule,
        ZonasModule,
        CronsModule,
        ThrottlerModule.forRoot([{ name: 'default', limit: 1000, ttl: 60_000 }]),
      ],
      controllers: [AdminController],
      providers: [
        AdminService,
        // El token se declara también en la raíz porque AdminService vive aquí
        // y CronsModule no reexporta OpenMeteoService.
        { provide: OpenMeteoService, useValue: openMeteoSimulado },
        {
          provide: ConfigService,
          useValue: {
            get: (clave: string) =>
              ({ ADMIN_API_KEY: CLAVE_ADMIN, CORS_ORIGINS: '', TRUST_PROXY_HOPS: 0 })[
                clave as 'ADMIN_API_KEY' | 'CORS_ORIGINS' | 'TRUST_PROXY_HOPS'
              ],
          },
        },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: ApiKeyGuard },
      ],
    })
      // La única red externa se simula: el resto (Prisma, Zonas) es real.
      .overrideProvider(OpenMeteoService)
      .useValue(openMeteoSimulado)
      .compile();

    app = modulo.createNestApplication<NestExpressApplication>();
    configurarApp(app, app.get(ConfigService));
    await app.init();

    prisma = app.get(PrismaService);
    crons = app.get(CronsService);

    const pais = await prisma.pais.create({ data: { nombre: `IT Cron País ${sufijo}` } });
    paisId = pais.id;
    const estado = await prisma.estado.create({
      data: { nombre: `IT Cron Estado ${sufijo}`, paisId },
    });
    estadoId = estado.id;
    const municipio = await prisma.municipio.create({
      data: { nombre: `IT Cron Municipio ${sufijo}`, slug: sufijo, estadoId },
    });
    municipioId = municipio.id;
    const zona = await prisma.zona.upsert({
      where: {
        latCentro_lngCentro_modelo: { latCentro: LAT, lngCentro: LNG, modelo: MODELO },
      },
      update: { municipioId },
      create: { municipioId, latCentro: LAT, lngCentro: LNG, ladoM: 9000 },
    });
    zonaId = zona.id;
  });

  beforeEach(async () => {
    getLluviaZonas.mockReset();
    await limpiarDatos();
  });

  afterAll(async () => {
    try {
      if (prisma) {
        if (municipioId) await prisma.zonaRiesgo.deleteMany({ where: { municipioId } });
        if (zonaId) {
          await prisma.reporte.deleteMany({ where: { zonaId } });
          await prisma.lecturaClima.deleteMany({ where: { zonaId } });
          await prisma.zona.deleteMany({ where: { id: zonaId } });
        }
        if (municipioId) await prisma.municipio.deleteMany({ where: { id: municipioId } });
        if (estadoId) await prisma.estado.deleteMany({ where: { id: estadoId } });
        if (paisId) await prisma.pais.deleteMany({ where: { id: paisId } });
      }
    } finally {
      await app?.close();
    }
  });

  describe('POST /api/v1/admin/cron/:nombre', () => {
    it('ejecuta actualizarClima de verdad y persiste la lectura y el estado', async () => {
      getLluviaZonas.mockImplementation(simularSoloMiZona);

      const respuesta = await request(app.getHttpServer())
        .post('/api/v1/admin/cron/actualizarClima')
        .set('x-api-key', CLAVE_ADMIN)
        .expect(201);

      expect(respuesta.body).toMatchObject({ nombre: 'actualizarClima', ejecutado: true });

      const lecturas = await prisma.lecturaClima.findMany({ where: { zonaId } });
      expect(lecturas).toHaveLength(1);
      expect(lecturas[0]).toMatchObject({ mm1h: 45, mm24h: 120, fuente: 'OPEN_METEO' });

      const zona = await prisma.zona.findUniqueOrThrow({ where: { id: zonaId } });
      expect(zona.estado).toBe('INUNDADO');
      expect(zona.mm1h).toBe(45);
      expect(zona.latModelo).toBe(13.26);
    });

    it('exige x-api-key válida antes de tocar la base de datos', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/admin/cron/actualizarClima')
        .expect(403);
      await request(app.getHttpServer())
        .post('/api/v1/admin/cron/actualizarClima')
        .set('x-api-key', 'incorrecta')
        .expect(403);

      expect(await prisma.lecturaClima.count({ where: { zonaId } })).toBe(0);
      expect(getLluviaZonas).not.toHaveBeenCalled();
    });

    it('responde 400 para un cron inexistente', async () => {
      const respuesta = await request(app.getHttpServer())
        .post('/api/v1/admin/cron/noExiste')
        .set('x-api-key', CLAVE_ADMIN)
        .expect(400);

      expect(respuesta.body.code).toBe('CRON_DESCONOCIDO');
    });
  });

  describe('reevaluarReportes', () => {
    async function sembrarReporte(clasificacion: 'INUNDADO' | 'PARCIAL' | 'NO_INUNDADO') {      return prisma.reporte.create({
        data: {
          zonaId,
          fuente: 'CIUDADANO',
          tipo: 'PENDIENTE',
          clasificacion,
          userLat: LAT,
          userLng: LNG,
        },
      });
    }

    it('corrobora el reporte y crea el ZonaRiesgo de inundación', async () => {
      const reporte = await sembrarReporte('INUNDADO');
      await prisma.lecturaClima.create({
        data: { zonaId, mm1h: 50, mm24h: 130, fuente: 'OPEN_METEO' },
      });

      const resultado = await crons.ejecutar('reevaluarReportes');
      expect(resultado.ejecutado).toBe(true);

      const actualizado = await prisma.reporte.findUniqueOrThrow({
        where: { id: reporte.id },
      });
      expect(actualizado.tipo).toBe('CORROBORADO');

      const riesgos = await prisma.zonaRiesgo.findMany({ where: { municipioId } });
      expect(riesgos).toHaveLength(1);
      expect(riesgos[0]).toMatchObject({
        motivo: 'INUNDACION',
        origen: 'CLIMA',
        activa: true,
        radioM: 500,
      });
      expect(riesgos[0]?.venceEn?.getTime()).toBeGreaterThan(Date.now());
    });

    it('marca NO_CORROBORADO cuando la lluvia real no supera el umbral', async () => {
      const reporte = await sembrarReporte('INUNDADO');
      await prisma.lecturaClima.create({
        data: { zonaId, mm1h: 0, mm24h: 0, fuente: 'OPEN_METEO' },
      });

      await crons.ejecutar('reevaluarReportes');

      const actualizado = await prisma.reporte.findUniqueOrThrow({
        where: { id: reporte.id },
      });
      expect(actualizado.tipo).toBe('NO_CORROBORADO');
      expect(await prisma.zonaRiesgo.count({ where: { municipioId } })).toBe(0);
    });

    it('deja PENDIENTE el reporte sin lectura climática', async () => {
      const reporte = await sembrarReporte('PARCIAL');

      await crons.ejecutar('reevaluarReportes');

      const actualizado = await prisma.reporte.findUniqueOrThrow({
        where: { id: reporte.id },
      });
      expect(actualizado.tipo).toBe('PENDIENTE');
    });
  });

  describe('expirarRiesgos', () => {
    it('desactiva los riesgos vencidos y conserva los vigentes', async () => {
      const vencido = await prisma.zonaRiesgo.create({
        data: {
          municipioId,
          lat: LAT,
          lng: LNG,
          radioM: 500,
          motivo: 'INUNDACION',
          origen: 'CLIMA',
          venceEn: new Date(Date.now() - 60 * 60 * 1000),
        },
      });
      const vigente = await prisma.zonaRiesgo.create({
        data: {
          municipioId,
          lat: LAT,
          lng: LNG,
          radioM: 500,
          motivo: 'INUNDACION',
          origen: 'CLIMA',
          venceEn: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const resultado = await crons.ejecutar('expirarRiesgos');

      expect(resultado.ejecutado).toBe(true);
      expect(
        (await prisma.zonaRiesgo.findUniqueOrThrow({ where: { id: vencido.id } })).activa,
      ).toBe(false);
      expect(
        (await prisma.zonaRiesgo.findUniqueOrThrow({ where: { id: vigente.id } })).activa,
      ).toBe(true);
    });
  });
});

describe.skipIf(HAY_BD)('crons sin base de datos', () => {
  it('los tests de integración se omiten cuando falta DATABASE_URL', () => {
    expect(HAY_BD).toBe(false);
  });
});
