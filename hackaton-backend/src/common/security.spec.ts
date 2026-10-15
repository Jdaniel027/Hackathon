import 'reflect-metadata';
import { Controller, Get, Query } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { IsString } from 'class-validator';
import request from 'supertest';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { configurarApp } from '../bootstrap/configurar-app.js';
import { validateEnv } from '../config/env.schema.js';
import { Admin } from './decorators/admin.decorator.js';
import { RateLimitEspecifico } from './decorators/rate-limit.decorator.js';
import { validationMessage } from './exception/validation-message.js';
import { ApiKeyGuard } from './guards/api-key.guard.js';

const API_KEY_PRUEBA = 'clave-de-prueba-no-real-para-los-tests';

class ConsultaDto {
  @IsString({ message: validationMessage('INVALID_NOMBRE', 'Nombre inválido.') })
  nombre!: string;
}

@Controller()
class RutasPruebaController {
  @Get('publico')
  publico(): { ok: true } {
    return { ok: true };
  }

  @Get('limitado')
  @RateLimitEspecifico(2, 60_000)
  limitado(): { ok: true } {
    return { ok: true };
  }

  @Get('admin-prueba')
  @Admin()
  admin(): { ok: true } {
    return { ok: true };
  }

  @Get('validar')
  validar(@Query() query: ConsultaDto): ConsultaDto {
    return query;
  }
}

describe('cimiento HTTP y seguridad', () => {
  let app: NestExpressApplication;

  beforeEach(async () => {
    const modulo = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ name: 'default', limit: 100, ttl: 60_000 }])],
      controllers: [RutasPruebaController],
      providers: [
        { provide: ConfigService, useValue: { get: (clave: string) => ({
          ADMIN_API_KEY: API_KEY_PRUEBA,
          CORS_ORIGINS: 'http://localhost:5173',
          TRUST_PROXY_HOPS: 0,
        })[clave as 'ADMIN_API_KEY' | 'CORS_ORIGINS' | 'TRUST_PROXY_HOPS'] } },
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

  it('sirve una ruta pública y devuelve el mismo requestId en cabecera y error', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/publico')
      .expect(200, { ok: true });

    const respuesta = await request(app.getHttpServer())
      .get('/api/v1/no-existe')
      .expect(404);
    expect(respuesta.body).toMatchObject({
      statusCode: 404,
      path: '/api/v1/no-existe',
      requestId: respuesta.headers['x-request-id'],
    });
    expect(respuesta.body.requestId).toEqual(expect.any(String));
  });

  it('protege las rutas admin sin filtrar la clave', async () => {
    const sinClave = await request(app.getHttpServer())
      .get('/api/v1/admin-prueba')
      .expect(403);
    expect(sinClave.body.code).toBe('ADMIN_KEY_MISSING');

    const incorrecta = await request(app.getHttpServer())
      .get('/api/v1/admin-prueba')
      .set('x-api-key', 'incorrecta')
      .expect(403);
    expect(incorrecta.body.code).toBe('ADMIN_KEY_INVALIDA');
    expect(JSON.stringify(incorrecta.body)).not.toContain(API_KEY_PRUEBA);

    await request(app.getHttpServer())
      .get('/api/v1/admin-prueba')
      .set('x-api-key', API_KEY_PRUEBA)
      .expect(200, { ok: true });
  });

  it('devuelve el envelope de validación con el campo afectado', async () => {
    const respuesta = await request(app.getHttpServer())
      .get('/api/v1/validar?nombre=hola&extra=1')
      .expect(400);
    expect(respuesta.body).toMatchObject({
      code: 'INVALID_INPUT',
      statusCode: 400,
      details: { field: 'extra' },
    });
  });

  it('limita peticiones aunque se cambie X-Forwarded-For sin proxy de confianza', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/limitado')
      .set('x-forwarded-for', '192.0.2.1')
      .expect(200);
    await request(app.getHttpServer())
      .get('/api/v1/limitado')
      .set('x-forwarded-for', '192.0.2.2')
      .expect(200);

    const bloqueada = await request(app.getHttpServer())
      .get('/api/v1/limitado')
      .set('x-forwarded-for', '192.0.2.3')
      .expect(429);
    expect(bloqueada.headers['retry-after']).toBeDefined();
    expect(bloqueada.body).toMatchObject({
      code: 'RATE_LIMIT_EXCEEDED',
      statusCode: 429,
      details: { retryAfterSeg: expect.any(Number) },
    });
  });
});

describe('configuración de proxy', () => {
  const obligatorias = {
    DATABASE_URL: 'postgresql://usuario:clave@localhost:5432/prueba',
    GEMINI_API_KEY: 'clave-ficticia',
    ADMIN_API_KEY: API_KEY_PRUEBA,
  };

  it('no confía en proxies de forma predeterminada', () => {
    expect(validateEnv(obligatorias).TRUST_PROXY_HOPS).toBe(0);
  });

  it('rechaza una cantidad de saltos inválida', () => {
    expect(() => validateEnv({ ...obligatorias, TRUST_PROXY_HOPS: -1 })).toThrow();
  });
});
