import 'reflect-metadata';
import { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { configurarApp } from '../../bootstrap/configurar-app.js';
import { ReportesController } from './reportes.controller.js';
import { ReportesService } from './reportes.service.js';
import { MAX_FOTO_BYTES } from './utils/validar-foto.util.js';

describe('límite de foto en POST /reportes', () => {
  it('responde 413 antes de procesar la foto si supera 10 MiB', async () => {
    const crear = vi.fn();
    const modulo = await Test.createTestingModule({
      controllers: [ReportesController],
      providers: [
        { provide: ReportesService, useValue: { crear, listar: vi.fn() } },
      ],
    }).compile();
    const app = modulo.createNestApplication<NestExpressApplication>();
    const config = { get: () => undefined } as unknown as ConfigService;
    configurarApp(app, config);
    await app.init();
    try {
      const respuesta = await request(app.getHttpServer())
        .post('/api/v1/reportes')
        .field('lat', '23.2494')
        .field('lng', '-106.4111')
        .attach('foto', Buffer.alloc(MAX_FOTO_BYTES + 1), {
          filename: 'foto.jpg',
          contentType: 'image/jpeg',
        })
        .expect(413);
      expect(respuesta.body.code).toBe('REPORT_ARCHIVO_MUY_GRANDE');
      expect(crear).not.toHaveBeenCalled();
    } finally {
      await app.close();
    }
  });
});
