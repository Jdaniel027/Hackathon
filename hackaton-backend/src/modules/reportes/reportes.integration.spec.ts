import 'reflect-metadata';
import { config as cargarEnv } from 'dotenv';
import type { ConfigService } from '@nestjs/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { configurarApp } from '../../bootstrap/configurar-app.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { GeminiService } from '../gemini/gemini.service.js';
import { ReportesModule } from './reportes.module.js';

cargarEnv({ quiet: true });

// Punto de prueba en aguas del Pacífico, lejos de cualquier zona del seed
// (Mazatlán ≈ 23.2, -106.4) para que `buscarZonaPorPunto` solo pueda devolver
// la zona que crea esta suite.
const LAT = 14.5;
const LNG = -92.0;
const MODELO = 'ecmwf_ifs';

const HAY_BD = Boolean(process.env.DATABASE_URL);

const clasificarFoto = vi.fn();

describe.skipIf(!HAY_BD)('API de reportes contra PostgreSQL real', () => {
  let app: NestExpressApplication;
  let prisma: PrismaService;
  let zonaId: number;
  let municipioId: number;
  let paisId: number;
  let estadoId: number;

  const base = '/api/v1/reportes';
  const sufijo = `it-rep-${Date.now().toString(36)}`;

  function contarReportes(): Promise<number> {
    return prisma.reporte.count({ where: { zonaId } });
  }

  beforeAll(async () => {
    const modulo = await Test.createTestingModule({
      imports: [PrismaModule, ReportesModule],
    })
      // El clasificador es el único borde no determinista: se simula.
      .overrideProvider(GeminiService)
      .useValue({ clasificarFoto })
      .compile();

    app = modulo.createNestApplication<NestExpressApplication>();
    const config = {
      get: (clave: string) =>
        ({ CORS_ORIGINS: '', TRUST_PROXY_HOPS: 0 })[
          clave as 'CORS_ORIGINS' | 'TRUST_PROXY_HOPS'
        ],
    } as unknown as ConfigService;
    configurarApp(app, config);
    await app.init();

    prisma = app.get(PrismaService);

    const pais = await prisma.pais.create({ data: { nombre: `IT País ${sufijo}` } });
    paisId = pais.id;
    const estado = await prisma.estado.create({
      data: { nombre: `IT Estado ${sufijo}`, paisId },
    });
    estadoId = estado.id;
    const municipio = await prisma.municipio.create({
      data: {
        nombre: `IT Municipio ${sufijo}`,
        slug: `it-rep-${sufijo}`,
        estadoId,
      },
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

  beforeEach(() => {
    // Cada test define su propia clasificación simulada; sin esto las llamadas
    // se acumularían entre casos y las aserciones "no llamó" fallarían.
    clasificarFoto.mockReset();
    clasificarFoto.mockResolvedValue('INUNDADO');
  });

  afterAll(async () => {
    try {
      if (prisma) {
        if (zonaId) {
          await prisma.reporte.deleteMany({ where: { zonaId } });
          await prisma.lecturaClima.deleteMany({ where: { zonaId } });
          await prisma.zona.deleteMany({ where: { id: zonaId } });
        }
        if (municipioId) {
          await prisma.zonaRiesgo.deleteMany({ where: { municipioId } });
          await prisma.municipio.deleteMany({ where: { id: municipioId } });
        }
        if (estadoId) await prisma.estado.deleteMany({ where: { id: estadoId } });
        if (paisId) await prisma.pais.deleteMany({ where: { id: paisId } });
      }
    } finally {
      await app?.close();
    }
  });

  describe('POST /api/v1/reportes', () => {
    it('201: guarda el reporte como PENDIENTE en la zona que contiene el punto', async () => {
      clasificarFoto.mockResolvedValueOnce('INUNDADO');

      const respuesta = await request(app.getHttpServer())
        .post(base)
        .field('lat', String(LAT))
        .field('lng', String(LNG))
        .attach('foto', Buffer.from('jpeg-simulado'), {
          filename: 'evidencia.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(respuesta.body).toMatchObject({
        zonaId,
        tipo: 'PENDIENTE',
        clasificacion: 'INUNDADO',
      });
      expect(typeof respuesta.body.id).toBe('number');

      const fila = await prisma.reporte.findUniqueOrThrow({
        where: { id: respuesta.body.id },
      });
      expect(fila).toMatchObject({
        zonaId,
        fuente: 'CIUDADANO',
        tipo: 'PENDIENTE',
        clasificacion: 'INUNDADO',
      });
      expect(fila.userLat).toBeCloseTo(LAT, 6);
      expect(fila.userLng).toBeCloseTo(LNG, 6);
    });

    it('traduce PRECAUCION a PARCIAL en la BD y de vuelta a PRECAUCION en la API', async () => {
      clasificarFoto.mockResolvedValueOnce('PRECAUCION');

      const respuesta = await request(app.getHttpServer())
        .post(base)
        .field('lat', String(LAT))
        .field('lng', String(LNG))
        .attach('foto', Buffer.from('jpeg-simulado'), {
          filename: 'evidencia.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      expect(respuesta.body.clasificacion).toBe('PRECAUCION');
      const fila = await prisma.reporte.findUniqueOrThrow({
        where: { id: respuesta.body.id },
      });
      expect(fila.clasificacion).toBe('PARCIAL');
    });

    it('415: rechaza la petición sin archivo', async () => {
      const antes = await contarReportes();

      const respuesta = await request(app.getHttpServer())
        .post(base)
        .field('lat', String(LAT))
        .field('lng', String(LNG))
        .expect(415);

      expect(respuesta.body.code).toBe('REPORT_ARCHIVO_INVALIDO');
      expect(await contarReportes()).toBe(antes);
    });

    it('415: rechaza un tipo MIME no permitido', async () => {
      const antes = await contarReportes();

      const respuesta = await request(app.getHttpServer())
        .post(base)
        .field('lat', String(LAT))
        .field('lng', String(LNG))
        .attach('foto', Buffer.from('%PDF-1.4'), {
          filename: 'evidencia.pdf',
          contentType: 'application/pdf',
        })
        .expect(415);

      expect(respuesta.body.code).toBe('REPORT_ARCHIVO_INVALIDO');
      expect(await contarReportes()).toBe(antes);
    });

    it('400: rechaza coordenadas que no caen en ninguna zona', async () => {
      const antes = await contarReportes();

      const respuesta = await request(app.getHttpServer())
        .post(base)
        .field('lat', '0')
        .field('lng', '0')
        .attach('foto', Buffer.from('jpeg-simulado'), {
          filename: 'evidencia.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);

      expect(respuesta.body.code).toBe('REPORT_FUERA_DE_ZONA');
      expect(await contarReportes()).toBe(antes);
    });

    it('400: rechaza una latitud fuera de rango', async () => {
      const respuesta = await request(app.getHttpServer())
        .post(base)
        .field('lat', '200')
        .field('lng', String(LNG))
        .attach('foto', Buffer.from('jpeg-simulado'), {
          filename: 'evidencia.jpg',
          contentType: 'image/jpeg',
        })
        .expect(400);

      expect(respuesta.body.code).toBe('INVALID_LAT');
      expect(clasificarFoto).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/v1/reportes', () => {
    it('lista los reportes de la zona con la clasificación traducida', async () => {
      clasificarFoto.mockResolvedValueOnce('INUNDADO');
      const creado = await request(app.getHttpServer())
        .post(base)
        .field('lat', String(LAT))
        .field('lng', String(LNG))
        .attach('foto', Buffer.from('jpeg-simulado'), {
          filename: 'evidencia.jpg',
          contentType: 'image/jpeg',
        })
        .expect(201);

      const respuesta = await request(app.getHttpServer())
        .get(base)
        .query({ zonaId })
        .expect(200);

      expect(respuesta.body.reportes.map((r: { id: number }) => r.id)).toContain(
        creado.body.id,
      );
      const listado = respuesta.body.reportes.find(
        (r: { id: number }) => r.id === creado.body.id,
      );
      expect(listado).toMatchObject({
        zonaId,
        tipo: 'PENDIENTE',
        clasificacion: 'INUNDADO',
        fuente: 'CIUDADANO',
      });
      expect(typeof listado.creadoEn).toBe('string');
    });

    it('filtra por "desde": un futuro lejano no devuelve la zona', async () => {
      const respuesta = await request(app.getHttpServer())
        .get(base)
        .query({ zonaId, desde: new Date(Date.now() + 60 * 60 * 1000).toISOString() })
        .expect(200);

      expect(respuesta.body.reportes).toEqual([]);
    });

    it('400: rechaza un zonaId no entero', async () => {
      const respuesta = await request(app.getHttpServer())
        .get(base)
        .query({ zonaId: 'abc' })
        .expect(400);

      expect(respuesta.body.code).toBe('INVALID_ZONA_ID');
    });

    it('400: rechaza un "desde" que no es ISO 8601', async () => {
      const respuesta = await request(app.getHttpServer())
        .get(base)
        .query({ desde: 'ayer' })
        .expect(400);

      expect(respuesta.body.code).toBe('INVALID_DESDE');
    });
  });
});

describe.skipIf(HAY_BD)('API de reportes sin base de datos', () => {
  it('los tests de integración se omiten cuando falta DATABASE_URL', () => {
    // Guardia de documentación: el arnés debe seguir verde sin BD.
    expect(HAY_BD).toBe(false);
  });
});
