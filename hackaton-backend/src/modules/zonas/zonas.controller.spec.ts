import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { configurarApp } from '../../bootstrap/configurar-app.js';
import { APP_ERRORS } from '../../common/exception/app-exception.js';
import { ZonasController } from './zonas.controller.js';
import { ZonasService } from './zonas.service.js';

describe('rutas públicas del mapa', () => {
  let app: NestExpressApplication;
  const getMapa = vi.fn();
  const getZona = vi.fn();

  beforeEach(async () => {
    vi.resetAllMocks();
    const modulo = await Test.createTestingModule({
      controllers: [ZonasController],
      providers: [
        { provide: ZonasService, useValue: { getMapa, getZona } },
        { provide: ConfigService, useValue: { get: () => undefined } },
      ],
    }).compile();

    app = modulo.createNestApplication<NestExpressApplication>();
    configurarApp(app, app.get(ConfigService));
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('entrega el mapa público con el contrato acordado', async () => {
    const mapa = {
      municipio: 'mazatlan',
      actualizadoEn: '2026-10-15T12:00:00.000Z',
      zonas: [{
        id: 1, latCentro: 23.2494, lngCentro: -106.4111,
        ladoM: 9000, estado: 'NORMAL', mm1h: 0, mm24h: 0,
      }],
      zonasRiesgo: [],
    };
    getMapa.mockResolvedValue(mapa);

    await request(app.getHttpServer())
      .get('/api/v1/mapa/mazatlan')
      .expect(200, mapa);
    expect(getMapa).toHaveBeenCalledWith('mazatlan');
  });

  it('envía el código de dominio cuando el municipio no existe', async () => {
    getMapa.mockRejectedValue(APP_ERRORS.MUNICIPIO_NO_ENCONTRADO('noexiste'));

    const respuesta = await request(app.getHttpServer())
      .get('/api/v1/mapa/noexiste')
      .expect(404);
    expect(respuesta.body).toMatchObject({
      code: 'MUNICIPIO_NO_ENCONTRADO',
      path: '/api/v1/mapa/noexiste',
    });
  });

  it('entrega detalle de zona con lecturas', async () => {
    const detalle = {
      id: 1, municipioSlug: 'mazatlan', latCentro: 23.2494,
      lngCentro: -106.4111, ladoM: 9000, estado: 'NORMAL',
      mm1h: 0, mm24h: 0, lecturas: [],
    };
    getZona.mockResolvedValue(detalle);

    await request(app.getHttpServer()).get('/api/v1/zonas/1').expect(200, detalle);
    expect(getZona).toHaveBeenCalledWith(1);
  });

  it('devuelve 404 de dominio para una zona inexistente', async () => {
    getZona.mockRejectedValue(APP_ERRORS.ZONA_NO_ENCONTRADA(999));

    const respuesta = await request(app.getHttpServer())
      .get('/api/v1/zonas/999')
      .expect(404);
    expect(respuesta.body.code).toBe('ZONA_NO_ENCONTRADA');
  });
});
