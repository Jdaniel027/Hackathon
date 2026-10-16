import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configurarApp } from '../../bootstrap/configurar-app.js';
import { ApiKeyGuard } from '../../common/guards/api-key.guard.js';
import { CronsService } from '../crons/crons.service.js';
import { ConaguaService } from '../conagua/conagua.service.js';
import { OpenMeteoService } from '../open-meteo/open-meteo.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ZonasService } from '../zonas/zonas.service.js';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';

const CLAVE_PRUEBA = 'clave-local-simulada-de-admin-123456';
const caja = {
  municipioSlug: 'mazatlan',
  sw: { lat: 23.2, lng: -106.5 },
  ne: { lat: 23.3, lng: -106.4 },
};

describe('rutas HTTP de administración', () => {
  let app: NestExpressApplication;
  const simularLluvia = vi.fn();
  const generarZonas = vi.fn();
  const buscarZona = vi.fn();
  const encontrarZona = vi.fn();
  const encontrarZonas = vi.fn();
  const elevation = vi.fn();

  beforeEach(async () => {
    vi.resetAllMocks();
    simularLluvia.mockResolvedValue({ id: 1, estado: 'PRECAUCION' });
    generarZonas.mockResolvedValue({ creadas: 1 });
    encontrarZona.mockResolvedValue(null);
    // Sin zonas no hay trabajo que hacer: el cron responde 201 sin tocar la BD.
    encontrarZonas.mockResolvedValue([]);

    const prisma = {
      zona: { findUnique: encontrarZona, findMany: encontrarZonas },
    } as unknown as PrismaService;
    const zonas = {
      simularLluvia,
      generarZonas,
      buscarZonaPorPunto: buscarZona,
    } as unknown as ZonasService;
    const openMeteo = {
      getElevaciones: elevation,
    } as unknown as OpenMeteoService;

    const modulo = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([{ name: 'default', limit: 100, ttl: 60_000 }]),
      ],
      controllers: [AdminController],
      providers: [
        {
          provide: AdminService,
          useValue: new AdminService(prisma, zonas, openMeteo),
        },
        // CronsService los necesita para construirse; el cron real es el que
        // ejecuta /admin/cron/:nombre.
        { provide: PrismaService, useValue: prisma },
        { provide: OpenMeteoService, useValue: openMeteo },
        {
          provide: ConaguaService,
          useValue: { getPronosticosPorHora: vi.fn() },
        },
        CronsService,
        {
          provide: ConfigService,
          useValue: {
            get: (nombre: string) =>
              ({
                ADMIN_API_KEY: CLAVE_PRUEBA,
                TRUST_PROXY_HOPS: 0,
              })[nombre as 'ADMIN_API_KEY' | 'TRUST_PROXY_HOPS'],
          },
        },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
        { provide: APP_GUARD, useClass: ApiKeyGuard },
      ],
    }).compile();

    app = modulo.createNestApplication<NestExpressApplication>();
    configurarApp(app, app.get(ConfigService));
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it.each([
    ['/api/v1/admin/simular-lluvia', { zonaId: 1, mm1h: 20, mm24h: 50 }],
    ['/api/v1/admin/zonas/generar', caja],
    ['/api/v1/admin/cron/actualizarClima', {}],
    ['/api/v1/admin/riesgo-altura/1', {}],
    [
      '/api/v1/admin/ciclon',
      { lat: 23.2, lng: -106.4, categoria: '1', vientoKmh: 130 },
    ],
  ])(
    'protege %s antes de intentar escribir o ejecutar trabajos',
    async (ruta, cuerpo) => {
      const respuesta = await request(app.getHttpServer())
        .post(ruta)
        .send(cuerpo)
        .expect(403);
      expect(respuesta.body.code).toBe('ADMIN_KEY_MISSING');
      await request(app.getHttpServer())
        .post(ruta)
        .set('x-api-key', 'incorrecta')
        .send(cuerpo)
        .expect(403);
      expect(simularLluvia).not.toHaveBeenCalled();
      expect(generarZonas).not.toHaveBeenCalled();
      expect(encontrarZona).not.toHaveBeenCalled();
    },
  );

  it('simula lluvia y valida coordenadas y números sin escribir datos inválidos', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/simular-lluvia')
      .set('x-api-key', CLAVE_PRUEBA)
      .send({ zonaId: 1, mm1h: 20, mm24h: 50 })
      .expect(201, { id: 1, estado: 'PRECAUCION' });
    expect(simularLluvia).toHaveBeenCalledWith(1, 20, 50);

    await request(app.getHttpServer())
      .post('/api/v1/admin/simular-lluvia')
      .set('x-api-key', CLAVE_PRUEBA)
      .send({ zonaId: 1, mm1h: -1, mm24h: 50 })
      .expect(400);
    expect(simularLluvia).toHaveBeenCalledTimes(1);

    await request(app.getHttpServer())
      .post('/api/v1/admin/zonas/generar')
      .set('x-api-key', CLAVE_PRUEBA)
      .send({ ...caja, sw: { lat: 200, lng: -106.5 } })
      .expect(400);
    expect(generarZonas).not.toHaveBeenCalled();
  });

  it('delega la malla válida y rechaza el id de zona inválido', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/zonas/generar')
      .set('x-api-key', CLAVE_PRUEBA)
      .send(caja)
      .expect(201, { creadas: 1 });
    expect(generarZonas).toHaveBeenCalledWith(
      'mazatlan',
      [23.2, -106.5],
      [23.3, -106.4],
    );

    const respuesta = await request(app.getHttpServer())
      .post('/api/v1/admin/riesgo-altura/no-numero')
      .set('x-api-key', CLAVE_PRUEBA)
      .expect(400);
    expect(respuesta.body).toMatchObject({
      code: 'INVALID_ZONA_ID',
      message: 'El id de la zona debe ser un entero.',
      details: { field: 'zonaId' },
    });
    expect(encontrarZona).not.toHaveBeenCalled();
  });

  it('acepta solo crons de la lista y ejecuta el solicitado', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/admin/cron/otro')
      .set('x-api-key', CLAVE_PRUEBA)
      .expect(400);

    const respuesta = await request(app.getHttpServer())
      .post('/api/v1/admin/cron/actualizarClima')
      .set('x-api-key', CLAVE_PRUEBA)
      .expect(201);
    expect(respuesta.body).toMatchObject({ nombre: 'actualizarClima' });
  });

  it('rechaza ciclones fuera de zona y valida el DTO', async () => {
    const respuesta = await request(app.getHttpServer())
      .post('/api/v1/admin/ciclon')
      .set('x-api-key', CLAVE_PRUEBA)
      .send({ lat: 23.2, lng: -106.4, categoria: '1', vientoKmh: 130 })
      .expect(400);
    expect(respuesta.body.code).toBe('REPORT_FUERA_DE_ZONA');
    expect(encontrarZona).not.toHaveBeenCalled();
    expect(buscarZona).toHaveBeenCalledOnce();
    expect(elevation).not.toHaveBeenCalled();

    await request(app.getHttpServer())
      .post('/api/v1/admin/ciclon')
      .set('x-api-key', CLAVE_PRUEBA)
      .send({ lat: 23.2, lng: -106.4, categoria: '', vientoKmh: 130 })
      .expect(400);
  });
});
